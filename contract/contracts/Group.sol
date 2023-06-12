// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import './Event.sol';
import './Enums.sol';

interface IEvent {
  function addTicketType(string memory _name, uint256 _fee, uint256 _maxParticipants, ParticipantType _participantType, string memory _metadataURI, bool _requireSignature) external;
  function withdrawFunds(address _to) external;
}

contract Group is ERC721, Ownable {
  event MemberAdded(address indexed _member);
  event EventCreated(string indexed _eventId, address indexed _eventAddress);

  using Counters for Counters.Counter;
  Counters.Counter private tokenIdCounter;

  using Address for address payable;

  string public groupId;
  string public baseTokenURI;
  mapping(string => address) internal eventAddress;

  modifier onlyAdminOrMember() {
    require(
      owner() == msg.sender || balanceOf(msg.sender) > 0,
      'Admin or member only'
    );
    _;
  }

  constructor(
    string memory _groupId,
    string memory _baseTokenURI
  ) ERC721('thirdevent GroupMember', 'TEGM') {
    groupId = _groupId;
    baseTokenURI = _baseTokenURI;
  }

  function tokenURI(
    uint256 _tokenId
  ) public view override returns (string memory) {
    require(_exists(_tokenId), 'Nonexistent token');
    return baseTokenURI;
  }

  function createEvent(
    string memory _eventId
  ) public onlyAdminOrMember returns (address) {
    Event newEvent = new Event(_eventId);
    newEvent.transferOwnership(address(this));

    address newEventAddress = address(newEvent);
    eventAddress[_eventId] = newEventAddress;

    emit EventCreated(_eventId, newEventAddress);

    return newEventAddress;
  }

  function getEventAddress(
    string memory _eventId
  ) public view returns (address) {
    return eventAddress[_eventId];
  }

  function addMember(address _account) public onlyAdminOrMember {
    require(balanceOf(_account) == 0, 'Already a member');
    uint256 tokenId = tokenIdCounter.current();
    tokenIdCounter.increment();
    _safeMint(_account, tokenId);
    emit MemberAdded(_account);
  }

  // ----- Event method -----

  function addTicketType(
    address _eventAddress,
    string memory _name,
    uint256 _fee,
    uint256 _maxParticipants,
    ParticipantType _participantType,
    string memory _metadataURI,
    bool _requireSignature
  ) public onlyAdminOrMember {
    IEvent(_eventAddress).addTicketType(_name, _fee, _maxParticipants, _participantType, _metadataURI, _requireSignature);
  }

  function withdrawFromEvent(address _eventAddress) public onlyAdminOrMember {
    IEvent(_eventAddress).withdrawFunds(address(this));
  }

  receive() external payable {}

  fallback() external payable {}
}
