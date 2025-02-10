// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateContract {
    mapping(bytes32 => bool) public certificates;
    
    event CertificateAdded(bytes32 indexed certificateHash);
    event CertificateVerified(bytes32 indexed certificateHash, bool isValid);
    
    function addCertificate(bytes32 certificateHash) public {
        certificates[certificateHash] = true;
        emit CertificateAdded(certificateHash);
    }
    
    function verifyCertificate(bytes32 certificateHash) public returns (bool) {
        bool isValid = certificates[certificateHash];
        emit CertificateVerified(certificateHash, isValid);
        return isValid;
    }
}
