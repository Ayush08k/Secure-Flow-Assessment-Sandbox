import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  LogOut, 
  User, 
  Download, 
  AlertTriangle,
  FolderOpen,
  Eye,
  EyeOff
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

interface FileItem {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  ownerId: string;
  ownerName: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Auth Form State
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerAsAdmin, setRegisterAsAdmin] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // File Upload & List State
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // IDOR / Security Testing State
  const [idorFileId, setIdorFileId] = useState('');
  const [idorTesting, setIdorTesting] = useState(false);
  const [idorResult, setIdorResult] = useState<{ status: number; message: string; success: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if an admin already exists in the sandbox
  const checkAdminExists = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/admin-exists`);
      if (res.ok) {
        const data = await res.json();
        setAdminExists(data.exists);
        if (data.exists) {
          setRegisterAsAdmin(false);
        }
      }
    } catch (e) {
      console.error("Error checking admin exists:", e);
    }
  };

  // Fetch profile and files on boot or token changes
  useEffect(() => {
    checkAdminExists();
    if (token) {
      fetchProfile();
      fetchFiles();
    } else {
      setUser(null);
      setFiles([]);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (e) {
      console.error("Error fetching files", e);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email,
          password,
          confirmPassword,
          role: registerAsAdmin ? 'admin' : 'user'
        })
      });
      const data = await res.json();

      if (res.ok) {
        setAuthSuccess('Registration successful! Please log in.');
        setActiveTab('login');
        setPassword('');
        setConfirmPassword('');
        checkAdminExists();
      } else {
        setAuthError(data.error || 'Registration failed.');
      }
    } catch (e: any) {
      setAuthError('Connection error or rate limit triggered.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        // Clear form
        setUsername('');
        setPassword('');
        setEmail('');
      } else {
        setAuthError(data.error || 'Login failed.');
      }
    } catch (e: any) {
      setAuthError('Connection error or rate limit triggered.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setFiles([]);
    setUploadError(null);
    setUploadSuccess(null);
    setIdorResult(null);
    checkAdminExists();
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploadError(null);
    setUploadSuccess(null);
    setUploadLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();

      if (res.ok) {
        setUploadSuccess(`File "${selectedFile.name}" uploaded successfully. Pending approval.`);
        setSelectedFile(null);
        fetchFiles();
      } else {
        setUploadError(data.error || 'Upload failed.');
      }
    } catch (e: any) {
      setUploadError('Connection error or rate limit triggered.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleStatusChange = async (fileId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`${API_BASE_URL}/files/${fileId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchFiles();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status.');
      }
    } catch (e) {
      console.error("Status update error", e);
    }
  };

  const handleViewFile = async (fileId: string, originalName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/files/${fileId}/view`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        // Open in new tab or download depending on mime type
        const newTab = window.open();
        if (newTab) {
          newTab.location.href = objectUrl;
        } else {
          // Fallback download link
          const a = document.createElement('a');
          a.href = objectUrl;
          a.download = originalName;
          a.click();
        }
      } else {
        const data = await res.json();
        alert(`Access Denied: ${data.error}`);
      }
    } catch (e) {
      alert("Error trying to view/download file.");
    }
  };

  // Simulate IDOR Vulnerability Test (P0 Release Decision verification)
  const handleIdorTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idorFileId.trim()) return;

    setIdorTesting(true);
    setIdorResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/files/${idorFileId.trim()}/view`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setIdorResult({
          status: res.status,
          message: "Vulnerability Found! You successfully bypassed authorization boundaries and viewed another user's file.",
          success: false
        });
      } else {
        const data = await res.json();
        setIdorResult({
          status: res.status,
          message: `Blocked: ${data.error}`,
          success: true
        });
      }
    } catch (e) {
      setIdorResult({
        status: 500,
        message: "Failed to connect to the server.",
        success: false
      });
    } finally {
      setIdorTesting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div id="root">
      {/* App Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">S</div>
          <div className="brand-name">Secure Flow Assessment Sandbox</div>
        </div>
        {user && (
          <div className="user-controls">
            <div className="user-badge">
              <User size={16} />
              <span>{user.username}</span>
              <span className={`badge-role ${user.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                {user.role}
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              <LogOut size={14} /> Log Out
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!user ? (
          /* AUTHENTICATION VIEW */
          <div className="auth-container animate-fade-in">
            <div className={`card ${authError ? 'animate-shake' : ''}`}>
              <h2 style={{ textAlign: 'center', marginBottom: '20px', fontFamily: 'var(--font-heading)' }}>
                {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              
              <div className="auth-tabs">
                <div 
                  className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('login'); setAuthError(null); setAuthSuccess(null); }}
                >
                  Log In
                </div>
                <div 
                  className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('signup'); setAuthError(null); setAuthSuccess(null); checkAdminExists(); }}
                >
                  Sign Up
                </div>
              </div>

              {authError && <div className="alert alert-danger"><AlertTriangle size={18} /> {authError}</div>}
              {authSuccess && <div className="alert alert-success"><CheckCircle size={18} /> {authSuccess}</div>}

              <form onSubmit={activeTab === 'login' ? handleLogin : handleSignup}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className={`collapsible-field ${activeTab === 'signup' ? 'show' : ''}`}>
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="name@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={activeTab === 'signup'}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      className="form-input" 
                      placeholder="Enter password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {activeTab === 'signup' && password.length > 0 && (
                    <div className="password-strength">
                      <div className={`strength-rule ${password.length >= 6 ? 'pass' : ''}`}>
                        {password.length >= 6 ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        <span>At least 6 characters</span>
                      </div>
                      <div className={`strength-rule ${/[A-Z]/.test(password) ? 'pass' : ''}`}>
                        {/[A-Z]/.test(password) ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        <span>Uppercase letter (A-Z)</span>
                      </div>
                      <div className={`strength-rule ${/[a-z]/.test(password) ? 'pass' : ''}`}>
                        {/[a-z]/.test(password) ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        <span>Lowercase letter (a-z)</span>
                      </div>
                      <div className={`strength-rule ${/[0-9]/.test(password) ? 'pass' : ''}`}>
                        {/[0-9]/.test(password) ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        <span>Number (0-9)</span>
                      </div>
                      <div className={`strength-rule ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? 'pass' : ''}`}>
                        {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        <span>Special character (!@#$...)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`collapsible-field ${activeTab === 'signup' ? 'show' : ''}`}>
                  <label className="form-label">Retype Password</label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      className="form-input" 
                      placeholder="Retype password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={activeTab === 'signup'}
                    />
                    <button 
                      type="button" 
                      className="password-toggle" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {activeTab === 'signup' && confirmPassword.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 500, color: password === confirmPassword ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {password === confirmPassword ? <CheckCircle size={13} /> : <XCircle size={13} />}
                      <span>{password === confirmPassword ? 'Passwords match' : 'Passwords do not match'}</span>
                    </div>
                  )}
                </div>

                <div className={`collapsible-checkbox ${activeTab === 'signup' && !adminExists ? 'show' : ''}`}>
                  <label className="form-checkbox">
                    <input 
                      type="checkbox" 
                      checked={registerAsAdmin}
                      onChange={(e) => setRegisterAsAdmin(e.target.checked)}
                    />
                    <span>Register as Admin (To test file approval)</span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '10px' }}
                  disabled={authLoading}
                >
                  {authLoading ? <div className="spinner"></div> : activeTab === 'login' ? 'Log In' : 'Sign Up'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED DASHBOARD */
          <div className="dashboard-grid animate-fade-in">
            {/* Left Column: Upload Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: '16px' }}>Upload Document</h3>
                
                {uploadError && <div className="alert alert-danger"><AlertTriangle size={18} /> {uploadError}</div>}
                {uploadSuccess && <div className="alert alert-success"><CheckCircle size={18} /> {uploadSuccess}</div>}

                <div 
                  className={`upload-dropzone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'animate-pulse-glow' : ''}`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div className="upload-icon-wrapper">
                    <Upload size={28} />
                  </div>
                  <div>
                    <p className="upload-text">
                      <span className="upload-text-highlight">Click to upload</span> or drag and drop
                    </p>
                    <p className="upload-limit-info">PDF, PNG, JPG, DOC up to 10MB</p>
                  </div>
                </div>

                {selectedFile && (
                  <div className="selected-file-banner">
                    <div className="selected-file-info">
                      <FileText size={18} style={{ color: 'var(--primary)' }} />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <div>{selectedFile.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatSize(selectedFile.size)}</div>
                      </div>
                    </div>
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      style={{ padding: '4px 8px' }}
                    >
                      Clear
                    </button>
                  </div>
                )}

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '16px' }}
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadLoading}
                >
                  {uploadLoading ? <div className="spinner"></div> : 'Submit Document'}
                </button>
              </div>

              {/* IDOR Test Simulation Sandbox */}
              <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <div className="idor-title">
                  <ShieldAlert size={18} /> IDOR Vulnerability Test Sandbox
                </div>
                <p className="idor-desc">
                  This panel lets you test database authorization boundaries. Enter any File ID to attempt accessing it. A secure backend should return a <b>403 Forbidden</b> response.
                </p>

                {idorResult && (
                  <div className={`alert ${idorResult.success ? 'alert-success' : 'alert-danger'}`}>
                    {idorResult.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <div>
                      <strong>Status {idorResult.status}:</strong> {idorResult.message}
                    </div>
                  </div>
                )}

                <form onSubmit={handleIdorTest} className="idor-inputs">
                  <input 
                    type="text" 
                    className="form-input idor-input" 
                    placeholder="Enter File UUID" 
                    value={idorFileId}
                    onChange={(e) => setIdorFileId(e.target.value)}
                    required
                  />
                  <button 
                    type="submit" 
                    className="btn btn-secondary btn-sm"
                    disabled={idorTesting}
                  >
                    {idorTesting ? 'Testing...' : 'Test Auth'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Files Dashboard Table */}
            <div className="card file-list-card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">
                    {user.role === 'admin' ? 'System Approval Dashboard (Admin)' : 'My Documents'}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {user.role === 'admin' 
                      ? 'Review and approve uploads across all system user accounts.' 
                      : 'List of your uploaded documents and their official verification status.'
                    }
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={fetchFiles}>
                  Refresh
                </button>
              </div>

              {files.length === 0 ? (
                <div className="empty-state">
                  <FolderOpen className="empty-icon" />
                  <p>No documents uploaded yet. Start by dropping a file on the left panel.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="files-table">
                    <thead>
                      <tr>
                        <th>File Name</th>
                        {user.role === 'admin' && <th>Owner</th>}
                        <th>Uploaded At</th>
                        <th>Size</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((file) => (
                        <tr key={file.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
                              <div style={{ fontWeight: '500' }}>
                                {file.originalName}
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  ID: {file.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          {user.role === 'admin' && (
                            <td>
                              <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                                {file.ownerName}
                              </span>
                            </td>
                          )}
                          <td>{new Date(file.uploadedAt).toLocaleTimeString()}</td>
                          <td>{formatSize(file.size)}</td>
                          <td>
                            <span className={`status-badge status-${file.status}`}>
                              {file.status === 'pending' && <Clock size={12} />}
                              {file.status === 'approved' && <CheckCircle size={12} />}
                              {file.status === 'rejected' && <XCircle size={12} />}
                              {file.status}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {user.role === 'admin' ? (
                                <>
                                  {file.status === 'pending' && (
                                    <>
                                      <button 
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleStatusChange(file.id, 'approved')}
                                        style={{ backgroundColor: 'var(--success)' }}
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        className="btn btn-danger btn-sm"
                                        onClick={() => handleStatusChange(file.id, 'rejected')}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleViewFile(file.id, file.originalName)}
                                  >
                                    <Download size={12} /> View
                                  </button>
                                </>
                              ) : (
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleViewFile(file.id, file.originalName)}
                                  disabled={file.status !== 'approved'}
                                  title={file.status !== 'approved' ? 'Requires admin approval' : 'Download file'}
                                >
                                  <Download size={12} /> View File
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
