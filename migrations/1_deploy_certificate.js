const CertificateContract = artifacts.require("CertificateContract");

module.exports = function(deployer) {
  deployer.deploy(CertificateContract);
};
