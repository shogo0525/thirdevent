// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import './Enums.sol';

contract Event is ERC721, Ownable {
  using ECDSA for bytes32;
  using Address for address payable;

  using Counters for Counters.Counter;
  Counters.Counter private tokenIdCounter;

  struct TicketType {
    string ticketId;
    string name;
    uint256 fee; // wei
    uint256 maxParticipants;
    uint256 currentParticipants;
    ParticipantType participantType;
    string metadataURI;
    bool requireSignature;
  }
  TicketType[] private ticketTypes;
  mapping(uint256 => string) private ticketIdByTokenId;
  mapping(string => uint256) private ticketTypeIndexByTicketId;

  string public eventId;
  mapping(uint256 => bool) public isClaimed;

  mapping(address => mapping(string => bool)) private ownerHasTicketType;

  address payable private platformAddress = payable(0xC274Db247360D9aA845E7F45775cB089B4622Ffe);
  address private signer = 0xC274Db247360D9aA845E7F45775cB089B4622Ffe;

  constructor(
    string memory _eventId
  ) ERC721('thirdevent EventTicket', 'TEET') {
    eventId = _eventId;
  }

  function tokenURI(
    uint256 _tokenId
  ) public view override returns (string memory) {
    require(_exists(_tokenId), 'Nonexistent token');
    return ticketTypes[ticketTypeIndexByTicketId[ticketIdByTokenId[_tokenId]] - 1].metadataURI;
  }

  function mint(string memory _ticketId, bytes calldata _signature) public payable {
    require(ticketTypes.length != 0, 'No ticket');
    // require(
    //   _ticketTypeIndex < ticketTypes.length,
    //   'Invalid ticket'
    // );
    require(
      ownerHasTicketType[msg.sender][_ticketId] == false,
      'Ticket bought'
    );
    require(
      ticketTypes[ticketTypeIndexByTicketId[_ticketId] - 1].currentParticipants < ticketTypes[ticketTypeIndexByTicketId[_ticketId] - 1].maxParticipants,
      'No slots'
    );
    require((ticketTypes[ticketTypeIndexByTicketId[_ticketId] - 1].fee > 0 && msg.value == ticketTypes[ticketTypeIndexByTicketId[_ticketId] - 1].fee) || (ticketTypes[ticketTypeIndexByTicketId[_ticketId] - 1].fee == 0 && msg.value == 0), 'Incorrect fee');

    if (ticketTypes[ticketTypeIndexByTicketId[_ticketId] - 1].requireSignature) {
      bytes32 hash = keccak256(abi.encodePacked(address(this), msg.sender, _ticketId));
      require(hash.toEthSignedMessageHash().recover(_signature) == signer, 'Invalid signature');
    }

    _mint(_ticketId);

    if (ticketTypes[ticketTypeIndexByTicketId[_ticketId] - 1].fee > 0) {
      sendPlatformFee(msg.value);
    }
  }

  function _mint(string memory _ticketId) private {
    uint256 tokenId = tokenIdCounter.current();
    tokenIdCounter.increment();
    _safeMint(msg.sender, tokenId);
    

    ticketTypes[ticketTypeIndexByTicketId[_ticketId] - 1].currentParticipants++;
    ticketIdByTokenId[tokenId] = _ticketId;
    ownerHasTicketType[msg.sender][_ticketId] = true;
  }

  function claim(uint256 _tokenId, bytes calldata _signature) public {
    require(_exists(_tokenId), 'Nonexistent token');
    require(ownerOf(_tokenId) == msg.sender, 'Not the token owner');
    bytes32 hash = keccak256(abi.encodePacked(address(this), msg.sender, _tokenId));
    require(hash.toEthSignedMessageHash().recover(_signature) == signer, 'Invalid signature');
    isClaimed[_tokenId] = true;
  }

  function addTicketType(
    string memory _ticketId,
    string memory _name,
    uint256 _fee,
    uint256 _maxParticipants,
    ParticipantType _participantType,
    string memory _metadataURI,
    bool _requireSignature
  ) public onlyOwner {
    ticketTypes.push(
      TicketType({
        ticketId: _ticketId,
        name: _name,
        fee: _fee,
        maxParticipants: _maxParticipants,
        currentParticipants: 0,
        participantType: _participantType,
        metadataURI: _metadataURI,
        requireSignature: _requireSignature
      })
    );
    ticketTypeIndexByTicketId[_ticketId] = ticketTypes.length;
  }

  function getAllTicketTypes() public view returns (TicketType[] memory) {
    return ticketTypes;
  }

  function withdrawFunds(address _to) external onlyOwner {
    require(address(this).balance > 0, 'No funds');
    payable(_to).sendValue(address(this).balance);
  }

  function sendPlatformFee(uint256 _amount) private {
    // Calculate 1% of the amount
    platformAddress.sendValue(_amount / 100);
  }

  function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        require(isClaimed[tokenId] == false);
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
  }
