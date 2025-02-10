import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';

const GetStarted = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dummyWallet] = useState(Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''));
  const [recipientName, setRecipientName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [description, setDescription] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#000000');
  const [fontStyle, setFontStyle] = useState('bold');
  const [certificateHash, setCertificateHash] = useState('');
  const [txHash, setTxHash] = useState('');
  const [generatedHash, setGeneratedHash] = useState('');
  const [certificateGenerated, setCertificateGenerated] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const canvasRef = useRef(null);

  // Certificate template configuration
  const certificateConfig = {
    width: 800,
    height: 600,
    borderColor: '#e5e7eb'
  };

  useEffect(() => {
    // Generate certificate whenever form values change
    if (canvasRef.current) {
      generateCertificate();
    }
  }, [recipientName, courseName, description, issueDate, bgColor, textColor, fontStyle]);

  const generateCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = certificateConfig.width;
    canvas.height = certificateConfig.height;
    
    // Clear canvas and set background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add decorative border
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 15;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Add inner border
    ctx.strokeStyle = certificateConfig.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);
    
    // Set text properties
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    
    // Add title
    ctx.font = `${fontStyle} 36px Montserrat`;
    ctx.fillText('CERTIFICATE OF ACHIEVEMENT', canvas.width/2, 120);
    
    // Add course name
    ctx.font = `${fontStyle} 28px Montserrat`;
    ctx.fillText(courseName || 'Course Name', canvas.width/2, 180);
    
    // Add "This is to certify that"
    ctx.font = '24px Montserrat';
    ctx.fillText('This is to certify that', canvas.width/2, 240);
    
    // Add recipient name
    ctx.font = `${fontStyle} 32px Montserrat`;
    ctx.fillText(recipientName || 'Recipient Name', canvas.width/2, 300);
    
    // Add description
    ctx.font = '18px Montserrat';
    const words = (description || 'Certificate Description').split(' ');
    let line = '';
    let yPos = 360;
    const maxWidth = canvas.width - 100;
    
    for (let word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        ctx.fillText(line, canvas.width/2, yPos);
        line = word + ' ';
        yPos += 30;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width/2, yPos);
    
    // Add date
    ctx.font = '16px Montserrat';
    ctx.fillText(`Issued on: ${new Date(issueDate).toLocaleDateString()}`, canvas.width/2, canvas.height - 80);
  };

  const downloadCertificate = (format) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure certificate is freshly generated before download
    generateCertificate();

    try {
      if (format === 'png') {
        const pngData = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = pngData;
        link.download = `${recipientName}_certificate_${new Date().getTime()}.png`;
        link.click();
      } else if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${recipientName}_certificate_${new Date().getTime()}.pdf`);
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Error downloading certificate. Please try again.');
    }
  };

  const generateCertificateHash = (certificateData) => {
    const dataString = JSON.stringify(certificateData);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    // Convert to positive hex string and pad to 64 characters
    return (hash >>> 0).toString(16).padStart(64, '0');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSuccessMessage(null);
    try {
      generateCertificate();
      
      // Create certificate data object
      const certificateData = {
        recipientName,
        courseName,
        description,
        issueDate,
        bgColor,
        textColor,
        fontStyle,
        timestamp: new Date().getTime(),
        dummyWallet
      };

      // Generate hash from certificate data
      const hash = generateCertificateHash(certificateData);
      setGeneratedHash(hash);
      setTxHash(Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')); // Dummy transaction hash
      
      // Set success message with hash details
      setSuccessMessage({
        title: 'Certificate Generated Successfully!',
        certificateHash: hash,
        transactionHash: `dummy_tx_${Date.now()}`
      });
      
      setCertificateGenerated(true);
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Error generating certificate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!certificateHash) {
      setVerificationResult({ success: false, message: 'Please enter a certificate hash' });
      return;
    }

    try {
      // Simple hash format verification
      if (!/^[0-9a-f]{64}$/i.test(certificateHash)) {
        throw new Error('Invalid certificate hash format');
      }

      // For demo purposes, we'll consider any valid hash format as verified
      setVerificationResult({
        success: true,
        message: 'Certificate verified successfully! This is a valid certificate.'
      });
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        success: false,
        message: 'Error verifying certificate: ' + error.message
      });
    }
  };

  useEffect(() => {
    // Initialize the certificate canvas
    if (canvasRef.current) {
      generateCertificate();
    }
  }, []);

  return (
    <div style={{ 
      width: '100%',
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* Tabs at the top */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          background: '#ffffff',
          padding: '0.5rem',
          borderRadius: '8px'
        }}>
          <button
            onClick={() => setActiveTab('generate')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'generate' ? '#3b82f6' : '#ffffff',
              color: activeTab === 'generate' ? '#ffffff' : '#000000',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Generate Certificate
          </button>
          <button
            onClick={() => setActiveTab('verify')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'verify' ? '#3b82f6' : '#ffffff',
              color: activeTab === 'verify' ? '#ffffff' : '#000000',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Verify Certificate
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div style={{ 
        display: 'flex',
        flex: 1
      }}>
        {activeTab === 'generate' ? (
          <>
            {/* Left side - Create Certificate */}
            <div style={{ 
              width: '50%',
              padding: '2rem',
              background: '#ffffff',
              borderRight: '1px solid #e5e7eb',
              fontFamily: 'Montserrat, sans-serif'
            }}>
              <h2 style={{ color: '#000000', fontSize: '24px', marginBottom: '20px', fontWeight: '600' }}>Create Certificate</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => {
                    setRecipientName(e.target.value);
                    generateCertificate();
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    color: '#000000',
                    background: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Course Name</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => {
                    setCourseName(e.target.value);
                    generateCertificate();
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    color: '#000000',
                    background: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    generateCertificate();
                  }}
                  rows="4"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    color: '#000000',
                    background: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    setIssueDate(e.target.value);
                    generateCertificate();
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    color: '#000000',
                    background: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Background Color</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    generateCertificate();
                  }}
                  style={{
                    width: '100%',
                    padding: '5px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    background: '#ffffff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Text Color</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    generateCertificate();
                  }}
                  style={{
                    width: '100%',
                    padding: '5px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    background: '#ffffff'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>Font Style</label>
                <select
                  value={fontStyle}
                  onChange={(e) => {
                    setFontStyle(e.target.value);
                    generateCertificate();
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    color: '#000000',
                    background: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                  <option value="italic">Italic</option>
                  <option value="bold italic">Bold Italic</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: '600',
                  boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 8px -1px rgba(139, 92, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(139, 92, 246, 0.3)';
                }}
              >
                Generate Certificate
              </button>
            </div>

            {/* Right side - Preview */}
            <div style={{ 
              width: '50%',
              padding: '2rem',
              background: '#ffffff'
            }}>
              <h2 style={{ color: '#000000', fontSize: '24px', marginBottom: '20px' }}>Preview</h2>
              <div style={{
                width: '100%',
                background: '#ffffff',
                borderRadius: '4px',
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
              {successMessage && (
                <div style={{ 
                  marginTop: '20px',
                  padding: '20px',
                  background: '#f0fdf4',
                  border: '1px solid #059669',
                  borderRadius: '8px',
                  fontFamily: 'Montserrat, sans-serif'
                }}>
                  <h4 style={{ 
                    color: '#059669',
                    marginTop: 0,
                    marginBottom: '15px',
                    fontWeight: '600',
                    fontSize: '18px'
                  }}>
                    {successMessage.title}
                  </h4>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ 
                      color: '#065f46',
                      display: 'block',
                      marginBottom: '5px',
                      fontWeight: '500',
                      fontSize: '14px'
                    }}>
                      Certificate Hash:
                    </label>
                    <div style={{
                      padding: '8px 12px',
                      background: '#ffffff',
                      border: '1px solid #059669',
                      borderRadius: '4px',
                      fontSize: '14px',
                      color: '#065f46',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace'
                    }}>
                      {successMessage.certificateHash}
                    </div>
                  </div>

                  {successMessage.transactionHash && (
                    <div>
                      <label style={{ 
                        color: '#065f46',
                        display: 'block',
                        marginBottom: '5px',
                        fontWeight: '500',
                        fontSize: '14px'
                      }}>
                        Transaction Hash:
                      </label>
                      <div style={{
                        padding: '8px 12px',
                        background: '#ffffff',
                        border: '1px solid #059669',
                        borderRadius: '4px',
                        fontSize: '14px',
                        color: '#065f46',
                        wordBreak: 'break-all',
                        fontFamily: 'monospace'
                      }}>
                        {successMessage.transactionHash}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Download buttons */}
              {certificateGenerated && (
                <div style={{ marginTop: '20px' }}>
                  <button
                    onClick={() => downloadCertificate('png')}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: '600',
                      boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 8px -1px rgba(139, 92, 246, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 6px -1px rgba(139, 92, 246, 0.3)';
                    }}
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={() => downloadCertificate('pdf')}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontFamily: 'Montserrat, sans-serif',
                      fontWeight: '600',
                      boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 8px -1px rgba(139, 92, 246, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 6px -1px rgba(139, 92, 246, 0.3)';
                    }}
                  >
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Verify Certificate Section */
          <div style={{ 
            width: '100%',
            padding: '2rem',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{ width: '50%' }}>
              <h2 style={{ 
                color: '#000000',
                fontSize: '24px',
                marginBottom: '20px',
                fontWeight: '600',
                fontFamily: 'Montserrat, sans-serif'
              }}>Verify Certificate</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  color: '#000000',
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500',
                  fontFamily: 'Montserrat, sans-serif'
                }}>Certificate Hash</label>
                <input
                  type="text"
                  value={certificateHash}
                  onChange={(e) => setCertificateHash(e.target.value)}
                  placeholder="Enter certificate hash to verify"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    color: '#000000',
                    background: '#ffffff',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                />
              </div>

              <button
                onClick={handleVerify}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: '600',
                  boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 8px -1px rgba(139, 92, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(139, 92, 246, 0.3)';
                }}
              >
                Verify Certificate
              </button>

              {verificationResult && (
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: verificationResult.success ? '#f0fdf4' : '#fef2f2',
                  borderRadius: '4px',
                  fontFamily: 'Montserrat, sans-serif'
                }}>
                  <h4 style={{ 
                    color: verificationResult.success ? '#059669' : '#dc2626',
                    marginBottom: '10px',
                    fontWeight: '600'
                  }}>
                    {verificationResult.success ? 'Certificate Verified!' : 'Verification Failed'}
                  </h4>
                  <p style={{ 
                    margin: 0,
                    color: '#000000'
                  }}>{verificationResult.message}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GetStarted;
