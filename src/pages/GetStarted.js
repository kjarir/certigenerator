import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Web3 from 'web3';
import CertificateContract from '../build/contracts/CertificateContract.json';
import jsPDF from 'jspdf';

const GetStarted = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [recipientName, setRecipientName] = useState('');
  const [description, setDescription] = useState('');
  const [certificateHash, setCertificateHash] = useState('');
  const [txHash, setTxHash] = useState('');
  const [certificateGenerated, setCertificateGenerated] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const canvasRef = useRef(null);

  // Certificate template configuration
  const certificateConfig = {
    width: 1200,
    height: 800,
    bgColor: '#ffffff',
    borderColor: 'rgba(147, 51, 234, 0.3)',
    titleFont: 'bold 48px Arial',
    subtitleFont: '32px Arial',
    nameFont: 'bold 40px Arial',
    textFont: '24px Arial',
    dateFont: '20px Arial',
    textColor: '#1a1a1a'
  };

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = certificateConfig.width;
    canvas.height = certificateConfig.height;
    
    // Clear canvas and set background
    ctx.fillStyle = certificateConfig.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add decorative border
    ctx.strokeStyle = certificateConfig.borderColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
    
    // Add inner border
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);
    
    // Add title
    ctx.fillStyle = certificateConfig.textColor;
    ctx.font = certificateConfig.titleFont;
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF ACHIEVEMENT', canvas.width/2, 180);
    
    // Add subtitle
    ctx.font = certificateConfig.subtitleFont;
    ctx.fillText('This is to certify that', canvas.width/2, 280);
    
    // Add name
    ctx.font = certificateConfig.nameFont;
    ctx.fillText(recipientName, canvas.width/2, 380);
    
    // Add description
    ctx.font = certificateConfig.textFont;
    const words = description.split(' ');
    let line = '';
    let yPos = 480;
    
    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > canvas.width - 200) {
        ctx.fillText(line, canvas.width/2, yPos);
        line = word + ' ';
        yPos += 40;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width/2, yPos);
    
    // Add date
    ctx.font = certificateConfig.dateFont;
    ctx.fillText(`Issued on: ${new Date().toLocaleDateString()}`, canvas.width/2, canvas.height - 120);
    
    return canvas.toDataURL('image/png', 1.0);
  };

  const downloadCertificate = (format) => {
    const canvas = canvasRef.current;
    const certificateImage = generateCertificate();
    
    if (format === 'png') {
      const link = document.createElement('a');
      link.href = certificateImage;
      link.download = `certificate_${new Date().getTime()}.png`;
      link.click();
    } else if (format === 'pdf') {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [certificateConfig.width, certificateConfig.height]
      });
      
      pdf.addImage(certificateImage, 'PNG', 0, 0, certificateConfig.width, certificateConfig.height);
      pdf.save(`certificate_${new Date().getTime()}.pdf`);
    }
  };

  useEffect(() => {
    const initWeb3 = async () => {
      try {
        const web3Instance = new Web3('http://127.0.0.1:8545');
        const accounts = await web3Instance.eth.getAccounts();
        
        const networkId = await web3Instance.eth.net.getId();
        const deployedNetwork = CertificateContract.networks[networkId];
        
        if (!deployedNetwork) {
          throw new Error('Contract not deployed to detected network.');
        }

        const contractInstance = new web3Instance.eth.Contract(
          CertificateContract.abi,
          deployedNetwork.address
        );

        setWeb3(web3Instance);
        setContract(contractInstance);
        setAccounts(accounts);
      } catch (error) {
        console.error("Error initializing Web3:", error);
        setError(error.message);
      }
    };

    initWeb3();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const certificateImage = generateCertificate();
      
      const certificateObject = {
        recipientName,
        description,
        image: certificateImage
      };
      
      const certificateString = JSON.stringify(certificateObject);
      const hash = web3.utils.sha3(certificateString);
      setCertificateHash(hash);
      
      const result = await contract.methods.addCertificate(hash)
        .send({ from: accounts[0] })
        .on('transactionHash', (hash) => setTxHash(hash));
      
      console.log('Certificate generated successfully:', result);
      setCertificateGenerated(true);
    } catch (error) {
      console.error('Error generating certificate:', error);
      setError('Error generating certificate. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!certificateHash) {
      setVerificationResult({
        success: false,
        message: 'Please enter a certificate hash to verify'
      });
      return;
    }

    setVerifyLoading(true);
    setVerificationResult(null);
    
    try {
      if (!web3.utils.isHexStrict(certificateHash)) {
        throw new Error('Invalid certificate hash format. Please enter a valid hash.');
      }

      const result = await contract.methods.verifyCertificate(certificateHash)
        .call({ from: accounts[0] });
      
      setVerificationResult({
        success: true,
        message: 'Certificate verified successfully!',
        data: result
      });
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        success: false,
        message: error.message || 'Failed to verify certificate. Please try again.'
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
        padding: '2rem 0'
      }}
    >
      <div className="container">
        {/* Tabs */}
        <motion.div 
          className="row justify-content-center mb-5"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="col-md-8">
            <div className="btn-group w-100" style={{
              background: 'rgba(17, 17, 17, 0.7)',
              border: '1px solid rgba(147, 51, 234, 0.3)',
              borderRadius: '15px',
              padding: '0.5rem',
              backdropFilter: 'blur(10px)'
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`btn ${activeTab === 'generate' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveTab('generate')}
                style={{
                  background: activeTab === 'generate' ? 'rgba(147, 51, 234, 0.9)' : 'transparent',
                  borderColor: 'rgba(147, 51, 234, 0.5)',
                  flex: 1,
                  padding: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  letterSpacing: '1px'
                }}
              >
                Generate Certificate
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`btn ${activeTab === 'verify' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveTab('verify')}
                style={{
                  background: activeTab === 'verify' ? 'rgba(147, 51, 234, 0.9)' : 'transparent',
                  borderColor: 'rgba(147, 51, 234, 0.5)',
                  flex: 1,
                  padding: '1rem',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  letterSpacing: '1px'
                }}
              >
                Verify Certificate
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Generate Certificate Form */}
        {activeTab === 'generate' && (
          <div className="row justify-content-center">
            <motion.div
              className="col-md-6"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="card" style={{
                background: 'rgba(17, 17, 17, 0.7)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)'
              }}>
                <div className="card-body p-4">
                  <h2 className="card-title mb-4" style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>Create Certificate</h2>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="form-label">Recipient Name</label>
                      <motion.input
                        whileFocus={{ scale: 1.02 }}
                        type="text"
                        className="form-control"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        required
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(147, 51, 234, 0.3)',
                          borderRadius: '10px',
                          padding: '0.8rem',
                          color: '#ffffff'
                        }}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="form-label">Description</label>
                      <motion.textarea
                        whileFocus={{ scale: 1.02 }}
                        className="form-control"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        rows="4"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(147, 51, 234, 0.3)',
                          borderRadius: '10px',
                          padding: '0.8rem',
                          color: '#ffffff'
                        }}
                      />
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)' }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
                        border: 'none',
                        padding: '1rem',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        letterSpacing: '1px',
                        borderRadius: '10px'
                      }}
                    >
                      {loading ? (
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      ) : null}
                      {loading ? 'Generating...' : 'Generate Certificate'}
                    </motion.button>
                  </form>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="col-md-6"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="card" style={{
                background: 'rgba(17, 17, 17, 0.7)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)',
                overflow: 'hidden'
              }}>
                <div className="card-body p-4">
                  <h2 className="card-title mb-4" style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>Preview</h2>
                  
                  <div className="canvas-container mb-4" style={{
                    border: '1px solid rgba(147, 51, 234, 0.3)',
                    borderRadius: '15px',
                    overflow: 'hidden'
                  }}>
                    <canvas
                      ref={canvasRef}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </div>

                  {certificateGenerated && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                    >
                      <div className="btn-group w-100 mb-4">
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)' }}
                          whileTap={{ scale: 0.98 }}
                          className="btn btn-primary me-2"
                          onClick={() => downloadCertificate('png')}
                          style={{
                            background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
                            border: 'none',
                            flex: 1,
                            padding: '0.8rem',
                            borderRadius: '10px'
                          }}
                        >
                          Download PNG
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)' }}
                          whileTap={{ scale: 0.98 }}
                          className="btn btn-primary ms-2"
                          onClick={() => downloadCertificate('pdf')}
                          style={{
                            background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
                            border: 'none',
                            flex: 1,
                            padding: '0.8rem',
                            borderRadius: '10px'
                          }}
                        >
                          Download PDF
                        </motion.button>
                      </div>

                      {txHash && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          className="alert"
                          style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '10px',
                            backdropFilter: 'blur(10px)'
                          }}
                        >
                          <h4 className="alert-heading mb-3" style={{ color: '#10b981' }}>
                            Certificate Generated Successfully!
                          </h4>
                          <p className="mb-2">
                            <strong>Transaction Hash:</strong><br/>
                            <small style={{ wordBreak: 'break-all' }}>{txHash}</small>
                          </p>
                          <p className="mb-3">
                            <strong>Certificate Hash:</strong><br/>
                            <small style={{ wordBreak: 'break-all' }}>{certificateHash}</small>
                          </p>
                          <hr style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}/>
                          <p className="mb-0" style={{ color: '#10b981' }}>
                            Save the Certificate Hash above - you'll need it to verify the certificate later!
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Verify Certificate Section */}
        {activeTab === 'verify' && (
          <motion.div
            className="row justify-content-center"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="col-md-8">
              <div className="card" style={{
                background: 'rgba(17, 17, 17, 0.7)',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                borderRadius: '20px',
                backdropFilter: 'blur(10px)'
              }}>
                <div className="card-body p-4">
                  <h2 className="card-title mb-4" style={{
                    fontSize: '2rem',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>Verify Certificate</h2>
                  
                  <div className="mb-4">
                    <label className="form-label">Certificate Hash</label>
                    <motion.input
                      whileFocus={{ scale: 1.02 }}
                      type="text"
                      className="form-control"
                      value={certificateHash}
                      onChange={(e) => setCertificateHash(e.target.value)}
                      placeholder="Enter certificate hash to verify"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(147, 51, 234, 0.3)',
                        borderRadius: '10px',
                        padding: '0.8rem',
                        color: '#ffffff'
                      }}
                    />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-primary w-100"
                    onClick={handleVerify}
                    disabled={verifyLoading}
                    style={{
                      background: 'linear-gradient(135deg, #9333ea 0%, #c026d3 100%)',
                      border: 'none',
                      padding: '1rem',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      letterSpacing: '1px',
                      borderRadius: '10px'
                    }}
                  >
                    {verifyLoading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Verifying...
                      </>
                    ) : (
                      'Verify Certificate'
                    )}
                  </motion.button>

                  {verificationResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4"
                    >
                      <div className="alert" style={{
                        background: verificationResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${verificationResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: '10px',
                        padding: '1rem',
                        color: verificationResult.success ? '#10b981' : '#ef4444'
                      }}>
                        <div className="d-flex align-items-center mb-2">
                          {verificationResult.success ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="15" y1="9" x2="9" y2="15"/>
                              <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                          )}
                          <h4 className="alert-heading mb-0" style={{ 
                            fontSize: '1.2rem',
                            fontWeight: '600'
                          }}>
                            {verificationResult.success ? 'Certificate Verified!' : 'Verification Failed'}
                          </h4>
                        </div>
                        <p className="mb-0" style={{ opacity: 0.9 }}>{verificationResult.message}</p>
                        {verificationResult.success && verificationResult.data && (
                          <div className="mt-3 pt-3" style={{ 
                            borderTop: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            <h5 className="mb-2" style={{ fontSize: '1.1rem' }}>Certificate Details:</h5>
                            <p className="mb-2">
                              <strong>Issuer:</strong><br/>
                              <small style={{ wordBreak: 'break-all' }}>{verificationResult.data.issuer}</small>
                            </p>
                            <p className="mb-2">
                              <strong>Issue Date:</strong><br/>
                              <small>{new Date(verificationResult.data.timestamp * 1000).toLocaleString()}</small>
                            </p>
                            <p className="mb-0">
                              <strong>Status:</strong><br/>
                              <span className="badge bg-success">Valid</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default GetStarted;
