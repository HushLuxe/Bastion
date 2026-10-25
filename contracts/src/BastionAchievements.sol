// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal ERC-721 implementation for Bastion achievement badges.
/// @dev    Artwork is generated on-chain: `tokenURI` returns a data URI holding the
///         badge SVG, so the gallery needs no hosting and no IPFS.
contract BastionAchievements {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event BadgeMinted(address indexed holder, uint256 indexed tokenId, uint8 badgeId);

    string public constant name = "Bastion Achievements";
    string public constant symbol = "BSTN";

    uint256 public constant BADGE_COUNT = 6;

    uint8 public constant FIRST_DEPOSIT = 0;
    uint8 public constant SAVED_100 = 1;
    uint8 public constant SAVED_500 = 2;
    uint8 public constant HELD_7_DAYS = 3;
    uint8 public constant HELD_30_DAYS = 4;
    uint8 public constant YIELD_10 = 5;

    address public immutable vault;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /// @notice badgeId => whether the holder already earned it.
    mapping(uint8 => mapping(address => bool)) public earned;

    /// @notice holder => badgeId => token id minted for that badge.
    mapping(address => mapping(uint8 => uint256)) public tokenIdByBadge;

    modifier onlyVault() {
        require(msg.sender == vault, "BastionAchievements: caller is not the vault");
        _;
    }

    constructor(address vault_) {
        require(vault_ != address(0), "BastionAchievements: zero vault");
        vault = vault_;
    }

    // ────────────────────────── ERC-721 ──────────────────────────

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "BastionAchievements: zero address");
        return _balanceOf[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _ownerOf[tokenId];
        require(owner != address(0), "BastionAchievements: unknown token");
        return owner;
    }

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || _operatorApprovals[owner][msg.sender], "BastionAchievements: not approved");
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_ownerOf[tokenId] != address(0), "BastionAchievements: unknown token");
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "BastionAchievements: approve to caller");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(ownerOf(tokenId) == from, "BastionAchievements: wrong owner");
        require(
            msg.sender == from || _tokenApprovals[tokenId] == msg.sender || _operatorApprovals[from][msg.sender],
            "BastionAchievements: not approved"
        );
        _tokenApprovals[tokenId] = address(0);
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        _safeTransfer(from, to, tokenId);
    }

    /// @dev    Wave 1 does not implement the ERC721Receiver callback: badges are
    ///         non-interactive collectibles, so transfers stay plain.
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory) external {
        _safeTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }

    // ────────────────────────── on-chain artwork ──────────────────────────

    /// @notice Human readable badge name.
    function badgeName(uint8 badgeId) public pure returns (string memory) {
        if (badgeId == FIRST_DEPOSIT) return "First Deposit";
        if (badgeId == SAVED_100) return "Saved 100 MUSD";
        if (badgeId == SAVED_500) return "Saved 500 MUSD";
        if (badgeId == HELD_7_DAYS) return "Held for 7 Days";
        if (badgeId == HELD_30_DAYS) return "Held for 30 Days";
        if (badgeId == YIELD_10) return "Earned 10 MUSD in Yield";
        return "Unknown";
    }

    /// @notice One line describing what the badge rewards.
    function badgeDescription(uint8 badgeId) public pure returns (string memory) {
        if (badgeId == FIRST_DEPOSIT) return "Your first MUSD deposit into Bastion.";
        if (badgeId == SAVED_100) return "Lifetime deposits reached 100 MUSD.";
        if (badgeId == SAVED_500) return "Lifetime deposits reached 500 MUSD.";
        if (badgeId == HELD_7_DAYS) return "Your position has been held for seven days.";
        if (badgeId == HELD_30_DAYS) return "Your position has been held for thirty days.";
        if (badgeId == YIELD_10) return "You have earned 10 MUSD in yield.";
        return "";
    }

    /// @notice Metadata URI for a badge. Artwork is generated on-chain as an SVG
    ///         data URI, so the gallery needs no hosting and no IPFS.
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        address holder = ownerOf(tokenId);
        uint8 badgeId = _badgeIdOf(holder, tokenId);
        string memory svg = _badgeSvg(badgeId, badgeName(badgeId), badgeDescription(badgeId));
        return string.concat("data:image/svg+xml;base64,", _base64(svg));
    }

    function _badgeIdOf(address holder, uint256 tokenId) internal view returns (uint8) {
        for (uint8 i = 0; i < 6; i++) {
            if (tokenIdByBadge[holder][i] == tokenId) return i;
        }
        return 0;
    }

    /// @dev Builds the badge artwork: a technical drawing sheet with a medallion.
    ///      Each milestone gets its own linework, drawn from the same primitives.
    function _badgeSvg(uint8 badgeId, string memory name_, string memory description_)
        internal
        pure
        returns (string memory)
    {
        string memory accent = _accent(badgeId);
        string memory glyph = _glyph(badgeId, accent);
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">',
            '<rect width="512" height="512" fill="#EDEAE3"/>',
            '<g stroke="#15191E" stroke-opacity="0.08" stroke-width="1">',
            '<path d="M0 64h512M0 128h512M0 192h512M0 256h512M0 320h512M0 384h512M0 448h512"/>',
            '<path d="M64 0v512M128 0v512M192 0v512M256 0v512M320 0v512M384 0v512M448 0v512"/>',
            "</g>",
            '<rect x="24" y="24" width="464" height="464" fill="none" stroke="#15191E" stroke-opacity="0.55" stroke-width="2"/>',
            '<path d="M24 96V24h72M488 96V24h-72M24 416v72h72M488 416v72h-72" fill="none" stroke="',
            accent,
            '" stroke-width="5"/>',
            '<circle cx="256" cy="244" r="146" fill="none" stroke="#15191E" stroke-opacity="0.25" stroke-width="2"/>',
            '<circle cx="256" cy="244" r="160" fill="none" stroke="#15191E" stroke-opacity="0.1" stroke-width="1" stroke-dasharray="6 10"/>',
            glyph,
            '<text x="48" y="70" font-family="Courier New, monospace" font-size="30" font-weight="700" fill="',
            accent,
            '">',
            _badgeNumber(badgeId),
            "</text>",
            '<text x="256" y="424" text-anchor="middle" font-family="Georgia, serif" font-size="38" font-weight="700" fill="#15191E">',
            name_,
            "</text>",
            '<text x="256" y="458" text-anchor="middle" font-family="Courier New, monospace" font-size="16" fill="#5C6672">',
            description_,
            "</text>",
            "</svg>"
        );
    }

    function _badgeNumber(uint8 badgeId) internal pure returns (string memory) {
        if (badgeId == 0) return "01";
        if (badgeId == 1) return "02";
        if (badgeId == 2) return "03";
        if (badgeId == 3) return "04";
        if (badgeId == 4) return "05";
        return "06";
    }

    function _accent(uint8 badgeId) internal pure returns (string memory) {
        if (badgeId == 0) return "#1F5F52";
        if (badgeId == 1) return "#2A7A68";
        if (badgeId == 2) return "#16463D";
        if (badgeId == 3) return "#397F6E";
        if (badgeId == 4) return "#123A33";
        return "#2F8A76";
    }

    /// @dev Linework for each milestone, drawn as a technical elevation.
    function _glyph(uint8 badgeId, string memory accent) internal pure returns (string memory) {
        if (badgeId == 0) {
            // an opened vault door
            return string.concat(
                '<path d="M180 300v-90a76 76 0 0 1 152 0v90" fill="none" stroke="#15191E" stroke-width="10"/>',
                '<path d="M168 300h176" stroke="',
                accent,
                '" stroke-width="10" stroke-linecap="round"/>',
                '<path d="M256 300v-46" stroke="#15191E" stroke-width="6"/>'
            );
        }
        if (badgeId == 1) {
            // stacked ingots
            return string.concat(
                '<rect x="176" y="272" width="160" height="34" rx="3" fill="none" stroke="#15191E" stroke-width="8"/>',
                '<rect x="192" y="232" width="128" height="32" rx="3" fill="none" stroke="',
                accent,
                '" stroke-width="8"/>',
                '<rect x="208" y="192" width="96" height="30" rx="3" fill="none" stroke="#15191E" stroke-width="8"/>'
            );
        }
        if (badgeId == 2) {
            // a keep with battlements
            return string.concat(
                '<path d="M170 302V196h30v22h20v-22h20v22h20v-22h20v22h30v106z" fill="none" stroke="#15191E" stroke-width="8" stroke-linejoin="round"/>',
                '<rect x="228" y="252" width="56" height="50" fill="',
                accent,
                '"/>'
            );
        }
        if (badgeId == 3) {
            // hourglass
            return string.concat(
                '<path d="M190 168h132l-66 74z" fill="none" stroke="#15191E" stroke-width="8" stroke-linejoin="round"/>',
                '<path d="M322 168l-66 74v62l66 68H190l66-68v-62z" fill="none" stroke="',
                accent,
                '" stroke-width="8" stroke-linejoin="round"/>'
            );
        }
        if (badgeId == 4) {
            // calendar with 30
            return string.concat(
                '<rect x="168" y="164" width="176" height="150" fill="none" stroke="#15191E" stroke-width="8"/>',
                '<path d="M168 214h176" stroke="#15191E" stroke-width="8"/>',
                '<path d="M210 142v40M302 142v40" stroke="',
                accent,
                '" stroke-width="8" stroke-linecap="round"/>',
                '<text x="256" y="292" text-anchor="middle" font-family="Georgia, serif" font-size="62" font-weight="700" fill="',
                accent,
                '">30</text>'
            );
        }
        // coin with a sprouting shoot
        return string.concat(
            '<circle cx="256" cy="250" r="74" fill="none" stroke="#15191E" stroke-width="8"/>',
            '<path d="M256 292v-52" stroke="',
            accent,
            '" stroke-width="8" stroke-linecap="round"/>',
            '<path d="M256 250c0-26 20-42 46-42-2 28-18 42-46 42z" fill="',
            accent,
            '"/>',
            '<path d="M256 272c0-22-16-34-38-34 2 22 16 34 38 34z" fill="none" stroke="#15191E" stroke-width="7"/>'
        );
    }

    /// @dev Standard base64 encoder so the SVG can be served as a data URI.
    function _base64(string memory data) internal pure returns (string memory) {
        bytes memory table = bytes("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
        bytes memory input = bytes(data);
        uint256 len = input.length;
        bytes memory out = new bytes(((len + 2) / 3) * 4);
        uint256 j;
        for (uint256 i = 0; i < len; i += 3) {
            uint256 b0 = uint8(input[i]);
            uint256 b1 = i + 1 < len ? uint8(input[i + 1]) : 0;
            uint256 b2 = i + 2 < len ? uint8(input[i + 2]) : 0;
            uint256 triple = (b0 << 16) | (b1 << 8) | b2;
            out[j++] = table[(triple >> 18) & 0x3F];
            out[j++] = table[(triple >> 12) & 0x3F];
            out[j++] = i + 1 < len ? table[(triple >> 6) & 0x3F] : bytes1("=");
            out[j++] = i + 2 < len ? table[triple & 0x3F] : bytes1("=");
        }
        return string(out);
    }

    // ────────────────────────── Bastion ──────────────────────────

    /// @notice Mints a badge to `holder`. One badge per holder per badge type.
    function mintBadge(address holder, uint8 badgeId) external onlyVault {
        require(holder != address(0), "BastionAchievements: zero holder");
        require(badgeId < BADGE_COUNT, "BastionAchievements: unknown badge");
        require(!earned[badgeId][holder], "BastionAchievements: already earned");

        earned[badgeId][holder] = true;

        uint256 tokenId = _nextTokenId++;
        _ownerOf[tokenId] = holder;
        _balanceOf[holder] += 1;
        tokenIdByBadge[holder][badgeId] = tokenId;

        emit Transfer(address(0), holder, tokenId);
        emit BadgeMinted(holder, tokenId, badgeId);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function _safeTransfer(address from, address to, uint256 tokenId) internal {
        transferFrom(from, to, tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        delete _tokenApprovals[tokenId];
        unchecked {
            _balanceOf[from] -= 1;
            _balanceOf[to] += 1;
        }
        _ownerOf[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }
}
