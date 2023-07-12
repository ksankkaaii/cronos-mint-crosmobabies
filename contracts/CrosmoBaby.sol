// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract AlienCrosmobaby is ERC721Enumerable, Ownable, ReentrancyGuard, ERC2981 {
    using Counters for Counters.Counter;
    using Strings for uint256;

    uint256 public saleState = 0;
    string baseURI;
    string public baseExtension = ".json";
    uint256 public cost = 149 ether;
    uint256 public crosmocraftCost = 129 ether;
    uint256 public crosmonautCost = 109 ether;
    uint256 public constant maxSupply = 500;
    
    Counters.Counter private _tokenIds;
    
    bool public paused = false;
    mapping(address => uint256) minted;

    address[] holders;
    uint256[] counts;

    address public teamWallet = 0xBaDa1b68A54f274814e050dbF0b6d1a8466e7A63;
    uint256 public teamFee = 920; 
    address public artistWallet = 0x2b98dbF6E4af55FaD3f509152a867849b358677F;
    uint256 public artistFee = 80; 
    uint256 constant SCALE = 1000;

    IERC721 public ICrosmonaut;
    IERC721 public ICrosmocraft;

    struct MintInfo {
        bool paused;
        uint256 supply;
        uint256 publicTimestamp;
    }

    constructor(
        string memory _initBaseURI,
        address _crosmonaut,
        address _crosmocraft
    ) ERC721("3D Alien Crosmobabys", "ACB") {
        setBaseURI(_initBaseURI);
        ICrosmonaut = IERC721(_crosmonaut);
        ICrosmocraft = IERC721(_crosmocraft);
    }

    // internal
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    // public
    function mint(uint256 amount) public payable nonReentrant {
        require(!paused, "paused");
        require(saleState > 0, "Sale is not started");
        if (saleState == 1) {
            require(isCrosmocraft(msg.sender) || isCrosmonaut(msg.sender), "No Crosmocraft or Crosmonaut");
        }
        require(minted[msg.sender] + amount <= (saleState == 1 ? 4 : 10), "Exceeds max mintable nfts");
        require(amount > 0, "amount can't be zero");
        uint256 supply = totalSupply();
        require(supply + amount <= maxSupply, "Max supply exceeded");
        uint256 price = cost;
        if (isCrosmocraft(msg.sender)) price = crosmocraftCost;
        if (isCrosmonaut(msg.sender)) price = crosmonautCost;
        require(msg.value >= price * amount, "insufficient funds");

        for (uint256 i = 0; i < amount; i++) {
            _tokenIds.increment();
            uint256 tokenId = _tokenIds.current();
            _safeMint(msg.sender, tokenId);
        }
    }

    function walletOfOwner(
        address _owner
    ) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        tokenId.toString(),
                        baseExtension
                    )
                )
                : "";
    }

    function isCrosmonaut(address _address) public view returns (bool) {
        return ICrosmonaut.balanceOf(_address) > 0;
    }

    function isCrosmocraft(address _address) public view returns (bool) {
        return ICrosmocraft.balanceOf(_address) > 0;
    }

    function startPresale() external onlyOwner {
        saleState = 1;
    }

    function startPublicSale() external onlyOwner {
        saleState = 2;
    }

    function setCost(uint256 _newCost) public onlyOwner {
        cost = _newCost;
    }

    function setCrosmonautCost(uint256 _newCrosmonautCost) public onlyOwner {
        crosmonautCost = _newCrosmonautCost;
    }

    function setCrosmocraftCost(uint256 _newCrosmocraftCost) public onlyOwner {
        crosmocraftCost = _newCrosmocraftCost;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setBaseExtension(
        string memory _newBaseExtension
    ) public onlyOwner {
        baseExtension = _newBaseExtension;
    }

    function pause(bool _state) public onlyOwner {
        paused = _state;
    }

    function setAirDropCounts(
        address[] memory _holders,
        uint256[] memory _counts
    ) external onlyOwner {
        require(_holders.length == _counts.length, "Input Data error");
        for (uint256 i = 0; i < _holders.length; i++) {
            holders.push(_holders[i]);
            counts.push(_counts[i]);
        }
    }

    function airdropNFTs(
        address[] memory _holders,
        uint256[] memory _counts
    ) external onlyOwner {
        require(_holders.length == _counts.length, "Input Data error");
        uint256 supply = totalSupply();
        for (uint256 i = 0; i < _holders.length; i++) {
            for (uint256 j = 0; j < _counts[i]; j++) {
                _tokenIds.increment();
         uint256 tokenId = _tokenIds.current();
            _safeMint(_holders[i], tokenId);
            }
            supply += _counts[i];
        }
    }

    function mintCost(address _minter) external view returns (uint256) {
        if (isCrosmonaut(_minter) == true) return crosmonautCost;
        if (isCrosmocraft(_minter) == true) return crosmocraftCost;
        return cost;
    }

    function withdraw() external {
        uint256 balance = address(this).balance;
        uint256 artist = (balance * artistFee) / SCALE;

        bool sent;
        (sent, ) = payable(artistWallet).call{value: artist}("");
        require(sent, "Sending cro failed");
        (sent, ) = payable(teamWallet).call{value: address(this).balance}("");
        require(sent, "Sending cro failed");
    }

    function teamMint(uint256 from, uint256 to) external onlyOwner {
        for (uint i = from; i <= to; i++) {
            require(i <= maxSupply, "Invalid token ID");
            _safeMint(teamWallet, i);
        }
    }

    function setArtistWallet(address _account) external onlyOwner {
        artistWallet = _account;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}