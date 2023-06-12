// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import './Group.sol';

contract GroupFactory {
  event GroupCreated(address indexed _groupAddress);

  mapping(string => address) internal groupAddress;

  function createGroup(
    string memory _groupId,
    string memory _baseTokenURI
  ) public returns (address) {
    Group newGroup = new Group(_groupId, _baseTokenURI);
    newGroup.addMember(msg.sender);
    newGroup.transferOwnership(msg.sender);

    address newGroupAddress = address(newGroup);
    groupAddress[_groupId] = newGroupAddress;
    emit GroupCreated(newGroupAddress);

    return newGroupAddress;
  }

  function getGroupAddress(
    string memory _groupId
  ) public view returns (address) {
    return groupAddress[_groupId];
  }
}
