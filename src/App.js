
import React, { useState, useEffect } from 'react';
import { Bell, Users, FileText, CheckCircle, XCircle, AlertCircle, Plus, Search, Trash2, RefreshCw, LogOut, ShieldCheck, Activity, Eye, Lock, Download, Filter, Calendar, TrendingUp, Mail, Phone, Edit, Save, X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      return data;
    } catch (error) {
      throw error;
    }
  },

  login: (credentials) => api.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  getMe: () => api.request('/auth/me'),
  register: (userData) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getCandidates: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/candidates${query ? `?${query}` : ''}`);
  },
  createCandidate: (data) => api.request('/candidates', { method: 'POST', body: JSON.stringify(data) }),
  updateCandidate: (id, data) => api.request(`/candidates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id, status) => api.request(`/candidates/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteCandidate: (id) => api.request(`/candidates/${id}`, { method: 'DELETE' }),
  getCandidateHistory: (id) => api.request(`/candidates/${id}/history`),
  getNotifications: () => api.request('/notifications'),
  markNotificationRead: (id) => api.request(`/notifications/${id}/read`, { method: 'PATCH' }),
  getDashboardStats: () => api.request('/dashboard/stats'),
  getPositions: () => api.request('/positions'),
  getUsers: () => api.request('/admin/users'),
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
  updateUserStatus: (id, isActive) => api.request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) })
};

const CandidateRegistrationSystem = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '', tenantName: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [candidates, setCandidates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [positions, setPositions] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, interviewed: 0, offered: 0 });
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [candidateHistory, setCandidateHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', position: '', resume: '', coverLetter: ''
  });
  const [editData, setEditData] = useState({
    id: '', name: '', email: '', phone: '', position: '', resume: '', coverLetter: ''
  });
  const [newUserForm, setNewUserForm] = useState({
    username: '', email: '', password: '', fullName: '', role: 'recruiter'
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) loadUserData();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'candidates') loadCandidates();
  }, [searchTerm, filterStatus, activeTab, isAuthenticated]);

  const loadUserData = async () => {
    try {
      const userData = await api.getMe();
      setCurrentUser(userData);
      setIsAuthenticated(true);
    } catch (err) {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [candidatesData, notificationsData, statsData, positionsData] = await Promise.all([
        api.getCandidates(),
        api.getNotifications(),
        api.getDashboardStats(),
        api.getPositions()
      ]);
      setCandidates(candidatesData);
      setNotifications(notificationsData);
      setStats(statsData);
      setPositions(positionsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async () => {
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      const data = await api.getCandidates(params);
      setCandidates(data);
    } catch (err) {
      console.error('Error loading candidates:', err);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [usersData, auditData] = await Promise.all([
        api.getUsers(),
        api.getAuditLogs({ limit: 50 })
      ]);
      setUsers(usersData);
      setAuditLogs(auditData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await api.login(loginForm);
      localStorage.setItem('token', response.token);
      setCurrentUser(response.user);
      setIsAuthenticated(true);
      setSuccessMessage(`Welcome, ${response.user.fullName}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleSubmitCandidate = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.position) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.createCandidate(formData);
      setFormData({ name: '', email: '', phone: '', position: '', resume: '', coverLetter: '' });
      setShowRegisterForm(false);
      setSuccessMessage('✅ Candidate registered successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCandidate = async () => {
    if (!editData.name || !editData.email || !editData.phone || !editData.position) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.updateCandidate(editData.id, editData);
      setEditData({ id: '', name: '', email: '', phone: '', position: '', resume: '', coverLetter: '' });
      setShowEditForm(false);
      setSuccessMessage('✅ Candidate updated successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!window.confirm(`Are you sure you want to change status to ${status}?`)) return;
    try {
      setLoading(true);
      setError('');
      await api.updateStatus(id, status);
      setSuccessMessage(`✅ Status changed to ${status}!`);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this candidate?')) return;
    try {
      setLoading(true);
      setError('');
      await api.deleteCandidate(id);
      setSuccessMessage('✅ Candidate deleted successfully!');
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.username || !newUserForm.email || !newUserForm.password || !newUserForm.fullName) {
      setError('Please fill in all required fields');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.register(newUserForm);
      setNewUserForm({ username: '', email: '', password: '', fullName: '', role: 'recruiter' });
      setShowUserForm(false);
      setSuccessMessage('✅ User created successfully!');
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = async (candidate) => {
    try {
      setSelectedCandidate(candidate);
      const history = await api.getCandidateHistory(candidate.id);
      setCandidateHistory(history);
      setShowHistoryModal(true);
    } catch (err) {
      setError('Failed to load history');
    }
  };

  const handleEdit = (candidate) => {
    setEditData({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      position: candidate.position,
      resume: candidate.resume || '',
      coverLetter: candidate.cover_letter || ''
    });
    setShowEditForm(true);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Position', 'Status', 'Applied Date'];
    const csvContent = [
      headers.join(','),
      ...candidates.map(c => [
        c.name, c.email, c.phone, c.position, c.status, c.applied_date
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-${Date.now()}.csv`;
    a.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 via-yellow-600 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-4">
              <ShieldCheck className="w-12 h-12 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Candidate Registration Interview System</h1>
            <p className="text-gray-600 mt-2">Multi Project Platform</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
              <input
                type="text"
                value={loginForm.tenantName}
                onChange={(e) => setLoginForm({...loginForm, tenantName: e.target.value})}
                placeholder="vrksatech"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="recruiters"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 font-semibold mb-2">Demo Credentials for candidate or unemployed registration: </p>
            <p className="text-xs text-gray-600">Tenant: <code className="bg-white px-2 py-1 rounded">vrksatech</code></p>
            <p className="text-xs text-gray-600">User: <code className="bg-white px-2 py-1 rounded">recruiters</code></p>
            <p className="text-xs text-gray-600">Pass: <code className="bg-white px-2 py-1 rounded">Vrksatech@123</code></p>
          </div>
         <div className="mt-3 text-center">
          <p className="text-gray-600">
            Terms and condition and Policy
           <a href="https://www.vrksatechnology.com" target="_blank" rel="noopener noreferrer"> vrksatechnology.com </a>
          {/*
              <button
              onClick={onSwitchToPolicyPages}
              className="text-orange-600 font-semibold hover:underline"
            >
              PolicyPage
            </button>
                */}
          </p>
         </div>
          <div className="border-t border-gray-800 mt-2 pt-1 text-center text-sm">
            <p>&copy; 2025 VRKSA TECHNOLOGY LLP . All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Candidate Registration and Interview System</h1>
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {currentUser?.tenant_name}
              </span>
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
                  {successMessage}
                </div>
              )}

              <button 
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <Bell className="w-6 h-6" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{currentUser?.full_name}</p>
                  <p className="text-xs text-gray-600">{currentUser?.role}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {['dashboard', 'candidates', 'notifications'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  loadAdminData();
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  activeTab === 'admin'
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
                Dashboard Overview
              </h2>
              <button
                onClick={() => setShowRegisterForm(true)}
                className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
              >
                <Plus className="w-5 h-5" />
                Register Candidate
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {[
                { label: 'Total', value: stats.total, color: 'yellow', icon: Users },
                { label: 'Pending', value: stats.pending, color: 'yellow', icon: AlertCircle },
                { label: 'Approved', value: stats.approved, color: 'green', icon: CheckCircle },
                { label: 'Rejected', value: stats.rejected, color: 'red', icon: XCircle },
                { label: 'Interviewed', value: stats.interviewed, color: 'purple', icon: Eye },
                { label: 'Offered', value: stats.offered, color: 'indigo', icon: FileText }
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600">{stat.label}</p>
                        <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value || 0}</p>
                      </div>
                      <Icon className={`w-8 h-8 text-${stat.color}-500`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Applications</h3>
              {candidates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No candidates yet</div>
              ) : (
                <div className="space-y-3">
                  {candidates.slice(0, 5).map(c => (
                    <div key={c.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-sm text-gray-600">{c.position}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {c.email}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {c.phone}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.status === 'approved' ? 'bg-green-100 text-green-800' :
                          c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          c.status === 'interviewed' ? 'bg-purple-100 text-purple-800' :
                          c.status === 'offered' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {c.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(c.applied_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">All Candidates</h2>
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="interviewed">Interviewed</option>
                  <option value="offered">Offered</option>
                </select>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {candidates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No candidates found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {candidates.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {c.email}
                            </p>
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {c.phone}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{c.position}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              c.status === 'approved' ? 'bg-green-100 text-green-800' :
                              c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              c.status === 'interviewed' ? 'bg-purple-100 text-purple-800' :
                              c.status === 'offered' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(c.applied_date).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewHistory(c)}
                                className="text-yellow-600 hover:text-yellow-800 text-xs"
                                title="View History"
                              >
                                <Activity className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(c)}
                                className="text-purple-600 hover:text-purple-800 text-xs"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {c.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(c.id, 'interviewed')}
                                    className="text-purple-600 hover:text-purple-800 text-xs"
                                  >Interview</button>
                                  <button
                                    onClick={() => handleStatusChange(c.id, 'approved')}
                                    className="text-green-600 hover:text-green-800 text-xs"
                                  >Approve</button>
                                  <button
                                    onClick={() => handleStatusChange(c.id, 'rejected')}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >Reject</button>
                                </>
                              )}
                              {c.status === 'interviewed' && (
                                <button
                                  onClick={() => handleStatusChange(c.id, 'offered')}
                                  className="text-indigo-600 hover:text-indigo-800 text-xs"
                                >Offer</button>
                              )}
                              {(currentUser?.role === 'admin' || currentUser?.role === 'recruiter') && (
                                <button
                                  onClick={() => handleDelete(c.id)}
                                  className="text-gray-600 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
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

        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Notifications</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={async () => {
                      if (!n.is_read) {
                        await api.markNotificationRead(n.id);
                        setNotifications(notifications.map(notif => 
                          notif.id === n.id ? { ...notif, is_read: true } : notif
                        ));
                      }
                    }}
                    className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      !n.is_read ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-900">{n.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{n.time}</p>
                      </div>
                      {!n.is_read && <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                Admin Panel
              </h2>
              <button
                onClick={() => setShowUserForm(true)}
                className="flex items-center gap-2 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
              >
                <Plus className="w-5 h-5" />
                Add User
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Users</h3>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'recruiter' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Audit Logs
              </h3>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{log.username || 'System'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                            log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                            log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {log.entity_type} #{log.entity_id}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {showRegisterForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Register New Candidate</h2>
                <button onClick={() => setShowRegisterForm(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="Ram Arcot"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="support@vrksatechnology.in"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="555-1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({...formData, position: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Select position</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.title}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
                  <textarea
                    rows={3}
                    value={formData.resume}
                    onChange={(e) => setFormData({...formData, resume: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="Resume details..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
                  <textarea
                    rows={3}
                    value={formData.coverLetter}
                    onChange={(e) => setFormData({...formData, coverLetter: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    placeholder="Cover letter..."
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSubmitCandidate}
                  disabled={loading}
                  className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Registering...' : 'Register Candidate'}
                </button>
                <button
                  onClick={() => setShowRegisterForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Edit Candidate</h2>
                <button onClick={() => setShowEditForm(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
                  <select
                    value={editData.position}
                    onChange={(e) => setEditData({...editData, position: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Select position</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.title}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
                  <textarea
                    rows={3}
                    value={editData.resume}
                    onChange={(e) => setEditData({...editData, resume: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
                  <textarea
                    rows={3}
                    value={editData.coverLetter}
                    onChange={(e) => setEditData({...editData, coverLetter: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleUpdateCandidate}
                  disabled={loading}
                  className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Updating...' : 'Update Candidate'}
                </button>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Application History</h2>
                <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="mb-4">
                <h3 className="font-semibold text-lg">{selectedCandidate.name}</h3>
                <p className="text-sm text-gray-600">{selectedCandidate.email}</p>
              </div>
              <div className="space-y-4">
                {candidateHistory.map((h, idx) => (
                  <div key={h.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        h.status === 'approved' ? 'bg-green-500' :
                        h.status === 'rejected' ? 'bg-red-500' :
                        h.status === 'interviewed' ? 'bg-purple-500' :
                        h.status === 'offered' ? 'bg-indigo-500' :
                        'bg-yellow-500'
                      }`}></div>
                      {idx < candidateHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 mt-2"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Status: {h.status}</p>
                          <p className="text-sm text-gray-600">By: {h.changed_by_name || 'System'}</p>
                          {h.notes && <p className="text-sm text-gray-500 mt-1">{h.notes}</p>}
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(h.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserForm && currentUser?.role === 'admin' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
                <button onClick={() => setShowUserForm(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm({...newUserForm, username: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newUserForm.fullName}
                    onChange={(e) => setNewUserForm({...newUserForm, fullName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleCreateUser}
                  disabled={loading}
                  className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
                <button
                  onClick={() => setShowUserForm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateRegistrationSystem;
