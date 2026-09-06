import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  Shield,
  Mail,
  User,
  AlertCircle,
  UserCheck,
  Award,
  ExternalLink,
  Briefcase,
  Database,
  RefreshCw
} from 'lucide-react';
import { launchConsultantPanel } from '../lib/auth';

export interface AdminUser {
  id: string;
  name: string;
  role: 'Super Admin' | 'Finance Admin' | 'Operations Admin' | 'Clinical Admin' | 'Support Admin';
  email: string;
  status: 'Active' | 'Inactive' | 'Pending';
  createdAt: string;
}

export interface ConsultantUser {
  id: string;
  name: string;
  profession: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Pending';
  createdAt: string;
}

const INITIAL_ADMINS: AdminUser[] = [
  { id: 'ADM-1', name: 'Dr. Alex Harrison', role: 'Super Admin', email: 'alex.admin@hexpertify.com', status: 'Active', createdAt: '2025-01-15' },
  { id: 'ADM-2', name: 'Finance Manager', role: 'Finance Admin', email: 'finance@hexpertify.com', status: 'Active', createdAt: '2025-02-01' },
  { id: 'ADM-3', name: 'Ops Team Lead', role: 'Operations Admin', email: 'ops@hexpertify.com', status: 'Active', createdAt: '2025-03-10' }
];

const INITIAL_CONSULTANTS: ConsultantUser[] = [
  { id: 'CON-1', name: 'Dr. Evelyn Reed, PhD', profession: 'Licensed Clinical Psychologist', email: 'dr.evelyn@hexpertify.com', status: 'Active', createdAt: '2025-01-10' },
  { id: 'CON-2', name: 'Dr. Alex Harrison', profession: 'Licensed Clinical Psychologist', email: 'alex.harrison@hexpertify.com', status: 'Active', createdAt: '2025-01-12' },
  { id: 'CON-3', name: 'Dr. Elena Rostova', profession: 'Marriage & Family Therapist', email: 'elena.rostova@hexpertify.com', status: 'Active', createdAt: '2025-02-05' },
  { id: 'CON-4', name: 'Marcus Vance', profession: 'Adolescent & Teen Counselor', email: 'marcus.vance@hexpertify.com', status: 'Active', createdAt: '2025-03-01' },
  { id: 'CON-5', name: 'Marcus Thorne', profession: 'Intuitive & Career Counselor', email: 'marcus.thorne@hexpertify.com', status: 'Active', createdAt: '2025-03-05' },
  { id: 'CON-6', name: 'Sophia Chakra', profession: 'Holistic Wellness & Mindfulness Expert', email: 'sophia.chakra@hexpertify.com', status: 'Active', createdAt: '2025-03-12' },
  { id: 'CON-7', name: 'Dr. Priya Sharma, PsyD', profession: 'Clinical Neuropsychologist', email: 'priya.sharma@hexpertify.com', status: 'Active', createdAt: '2025-03-18' },
  { id: 'CON-8', name: 'Dr. David Miller, MD', profession: 'Adult & Child Psychiatrist', email: 'david.miller@hexpertify.com', status: 'Active', createdAt: '2025-03-22' },
  { id: 'CON-9', name: 'Dr. Aris Thorne', profession: 'Trauma & Somatic Psychotherapist', email: 'aris.thorne@hexpertify.com', status: 'Active', createdAt: '2025-03-25' }
];

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'admins' | 'consultants'>('admins');
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  // Admin users state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    const saved = localStorage.getItem('hexpertify_admin_users');
    return saved ? JSON.parse(saved) : INITIAL_ADMINS;
  });

  // Consultant users state
  const [consultantUsers, setConsultantUsers] = useState<ConsultantUser[]>(() => {
    const saved = localStorage.getItem('hexpertify_consultant_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_CONSULTANTS.length) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_CONSULTANTS;
  });

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

  const [isConsultantModalOpen, setIsConsultantModalOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<ConsultantUser | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Admin Form fields
  const [adminFormData, setAdminFormData] = useState<{
    name: string;
    email: string;
    role: AdminUser['role'];
    status: AdminUser['status'];
  }>({
    name: '',
    email: '',
    role: 'Super Admin',
    status: 'Active'
  });

  // Consultant Form fields
  const [consultantFormData, setConsultantFormData] = useState<{
    name: string;
    email: string;
    profession: string;
    status: ConsultantUser['status'];
  }>({
    name: '',
    email: '',
    profession: 'Licensed Clinical Psychologist',
    status: 'Active'
  });

  const [errors, setErrors] = useState<{ name?: string; email?: string; profession?: string }>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── FETCH LIVE DATA FROM MONGODB ATLAS ───────────────────────
  const fetchLiveDatabaseData = async () => {
    setIsLoadingDb(true);
    try {
      // 1. Fetch Consultants from MongoDB Atlas
      let resCons = await fetch('/api/admin/consultants').catch(() => null);
      if (!resCons || !resCons.ok) {
        resCons = await fetch('http://localhost:5000/api/admin/consultants').catch(() => null);
      }
      if (resCons && resCons.ok) {
        const dataCons = await resCons.json();
        if (dataCons?.consultants && Array.isArray(dataCons.consultants) && dataCons.consultants.length > 0) {
          const liveCons: ConsultantUser[] = dataCons.consultants.map((c: any) => ({
            id: c.id || `CON-${String(c._id || '').slice(-4)}`,
            name: c.name,
            profession: c.profession || c.title || 'Clinical Consultant',
            email: c.email || `${c.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@hexpertify.com`,
            status: (c.accountStatus || 'Active') as any,
            createdAt: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '2025-01-10'
          }));
          setConsultantUsers(liveCons);
          setIsDbConnected(true);
        }
      }
    } catch (e) {
      // Offline fallback
    }

    try {
      // 2. Fetch Admin Users from MongoDB Atlas
      let resUsers = await fetch('/api/admin/users').catch(() => null);
      if (!resUsers || !resUsers.ok) {
        resUsers = await fetch('http://localhost:5000/api/admin/users').catch(() => null);
      }
      if (resUsers && resUsers.ok) {
        const dataUsers = await resUsers.json();
        if (dataUsers?.users && Array.isArray(dataUsers.users)) {
          const adminOnly = dataUsers.users.filter((u: any) => String(u.role).toUpperCase() === 'ADMIN');
          if (adminOnly.length > 0) {
            const liveAdmins: AdminUser[] = adminOnly.map((a: any) => ({
              id: a.id || `ADM-${String(a._id || '').slice(-4)}`,
              name: a.name || 'Admin User',
              role: 'Super Admin',
              email: a.email,
              status: (a.status || 'Active') as any,
              createdAt: a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '2025-01-15'
            }));
            setAdminUsers(liveAdmins);
            setIsDbConnected(true);
          }
        }
      }
    } catch (e) {}

    setIsLoadingDb(false);
  };

  useEffect(() => {
    fetchLiveDatabaseData();
  }, []);

  useEffect(() => {
    localStorage.setItem('hexpertify_admin_users', JSON.stringify(adminUsers));
  }, [adminUsers]);

  useEffect(() => {
    localStorage.setItem('hexpertify_consultant_users', JSON.stringify(consultantUsers));
  }, [consultantUsers]);

  // ── ADMIN USER HANDLERS ──────────────────────────────────────
  const handleOpenAddAdminModal = () => {
    setEditingAdmin(null);
    setAdminFormData({
      name: '',
      email: '',
      role: 'Super Admin',
      status: 'Active'
    });
    setErrors({});
    setIsAdminModalOpen(true);
  };

  const handleOpenEditAdminModal = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setAdminFormData({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status
    });
    setErrors({});
    setIsAdminModalOpen(true);
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove admin user "${name}"?`)) {
      setAdminUsers((prev) => prev.filter((usr) => usr.id !== id));
      showToast(`Admin user "${name}" removed successfully.`);

      try {
        let res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        }).catch(() => null);
        if (!res || !res.ok) {
          await fetch(`http://localhost:5000/api/admin/users?id=${encodeURIComponent(id)}`, {
            method: 'DELETE'
          }).catch(() => null);
        }
      } catch (e) {}
    }
  };

  const handleToggleAdminStatus = async (id: string) => {
    const usr = adminUsers.find((u) => u.id === id);
    if (!usr) return;
    const nextStatus: AdminUser['status'] = usr.status === 'Active' ? 'Inactive' : 'Active';

    setAdminUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: nextStatus } : u))
    );
    showToast(`Status updated to ${nextStatus} for ${usr.name}.`);

    try {
      let res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus })
      }).catch(() => null);
      if (!res || !res.ok) {
        await fetch('http://localhost:5000/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: nextStatus })
        }).catch(() => null);
      }
    } catch (e) {}
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; email?: string } = {};

    if (!adminFormData.name.trim()) {
      newErrors.name = 'Full Name is required.';
    }
    if (!adminFormData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminFormData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingAdmin) {
      setAdminUsers((prev) =>
        prev.map((usr) =>
          usr.id === editingAdmin.id
            ? {
                ...usr,
                name: adminFormData.name.trim(),
                email: adminFormData.email.trim(),
                role: adminFormData.role,
                status: adminFormData.status
              }
            : usr
        )
      );
      showToast(`Admin user "${adminFormData.name.trim()}" updated successfully.`);

      try {
        let res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAdmin.id,
            name: adminFormData.name.trim(),
            email: adminFormData.email.trim(),
            role: 'ADMIN'
          })
        }).catch(() => null);
        if (!res || !res.ok) {
          await fetch('http://localhost:5000/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: editingAdmin.id,
              name: adminFormData.name.trim(),
              email: adminFormData.email.trim(),
              role: 'ADMIN'
            })
          }).catch(() => null);
        }
      } catch (e) {}
    } else {
      const newAdmin: AdminUser = {
        id: `ADM-${Date.now().toString().slice(-4)}`,
        name: adminFormData.name.trim(),
        email: adminFormData.email.trim(),
        role: adminFormData.role,
        status: adminFormData.status,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setAdminUsers((prev) => [newAdmin, ...prev]);
      showToast(`New admin user "${newAdmin.name}" added successfully.`);

      try {
        let res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newAdmin.id,
            name: newAdmin.name,
            email: newAdmin.email,
            role: 'ADMIN'
          })
        }).catch(() => null);
        if (!res || !res.ok) {
          await fetch('http://localhost:5000/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newAdmin.id,
              name: newAdmin.name,
              email: newAdmin.email,
              role: 'ADMIN'
            })
          }).catch(() => null);
        }
      } catch (e) {}
    }

    setIsAdminModalOpen(false);
  };

  // ── CONSULTANT USER HANDLERS (LIVE DB SYNC) ─────────────────
  const handleOpenAddConsultantModal = () => {
    setEditingConsultant(null);
    setConsultantFormData({
      name: '',
      email: '',
      profession: 'Licensed Clinical Psychologist',
      status: 'Active'
    });
    setErrors({});
    setIsConsultantModalOpen(true);
  };

  const handleOpenEditConsultantModal = (consultant: ConsultantUser) => {
    setEditingConsultant(consultant);
    setConsultantFormData({
      name: consultant.name,
      email: consultant.email,
      profession: consultant.profession,
      status: consultant.status
    });
    setErrors({});
    setIsConsultantModalOpen(true);
  };

  const handleDeleteConsultant = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove consultant user "${name}"?`)) {
      setConsultantUsers((prev) => prev.filter((usr) => usr.id !== id));
      showToast(`Consultant user "${name}" removed successfully.`);

      try {
        let res = await fetch(`/api/admin/consultants?id=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        }).catch(() => null);
        if (!res || !res.ok) {
          await fetch(`http://localhost:5000/api/admin/consultants?id=${encodeURIComponent(id)}`, {
            method: 'DELETE'
          }).catch(() => null);
        }
      } catch (e) {}
    }
  };

  const handleToggleConsultantStatus = async (id: string) => {
    const usr = consultantUsers.find((c) => c.id === id);
    if (!usr) return;
    const nextStatus: ConsultantUser['status'] = usr.status === 'Active' ? 'Inactive' : 'Active';

    setConsultantUsers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );
    showToast(`Status updated to ${nextStatus} for ${usr.name}.`);

    try {
      let res = await fetch('/api/admin/consultants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          accountStatus: nextStatus
        })
      }).catch(() => null);
      if (!res || !res.ok) {
        await fetch('http://localhost:5000/api/admin/consultants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            accountStatus: nextStatus
          })
        }).catch(() => null);
      }
    } catch (e) {}
  };

  const handleConsultantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; email?: string; profession?: string } = {};

    if (!consultantFormData.name.trim()) {
      newErrors.name = 'Full Name is required.';
    }
    if (!consultantFormData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(consultantFormData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!consultantFormData.profession.trim()) {
      newErrors.profession = 'Profession / Specialty is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingConsultant) {
      setConsultantUsers((prev) =>
        prev.map((usr) =>
          usr.id === editingConsultant.id
            ? {
                ...usr,
                name: consultantFormData.name.trim(),
                email: consultantFormData.email.trim(),
                profession: consultantFormData.profession.trim(),
                status: consultantFormData.status
              }
            : usr
        )
      );
      showToast(`Consultant "${consultantFormData.name.trim()}" updated successfully in Database.`);

      try {
        let res = await fetch('/api/admin/consultants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingConsultant.id,
            name: consultantFormData.name.trim(),
            email: consultantFormData.email.trim(),
            profession: consultantFormData.profession.trim(),
            accountStatus: consultantFormData.status
          })
        }).catch(() => null);
        if (!res || !res.ok) {
          await fetch('http://localhost:5000/api/admin/consultants', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: editingConsultant.id,
              name: consultantFormData.name.trim(),
              email: consultantFormData.email.trim(),
              profession: consultantFormData.profession.trim(),
              accountStatus: consultantFormData.status
            })
          }).catch(() => null);
        }
      } catch (e) {}
    } else {
      const newConsultant: ConsultantUser = {
        id: `CON-${Date.now().toString().slice(-4)}`,
        name: consultantFormData.name.trim(),
        email: consultantFormData.email.trim(),
        profession: consultantFormData.profession.trim(),
        status: consultantFormData.status,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setConsultantUsers((prev) => [newConsultant, ...prev]);
      showToast(`New consultant user "${newConsultant.name}" saved to MongoDB Atlas database.`);

      try {
        let res = await fetch('/api/admin/consultants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: newConsultant.id,
            name: newConsultant.name,
            email: newConsultant.email,
            profession: newConsultant.profession,
            accountStatus: newConsultant.status,
            isCertified: true,
            platformFeePerSession: 500
          })
        }).catch(() => null);
        if (!res || !res.ok) {
          await fetch('http://localhost:5000/api/admin/consultants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newConsultant.id,
              name: newConsultant.name,
              email: newConsultant.email,
              profession: newConsultant.profession,
              accountStatus: newConsultant.status,
              isCertified: true,
              platformFeePerSession: 500
            })
          }).catch(() => null);
        }
      } catch (e) {}
    }

    setIsConsultantModalOpen(false);
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative rounded-[28px] bg-gradient-to-r from-[#4f28d9] via-[#5e2be2] to-[#3b1799] p-8 text-white shadow-xl overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-12 -top-12 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase text-purple-200 border border-white/20">
              Platform Configuration
            </span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              {isDbConnected ? 'MongoDB Live Sync' : 'Database Ready'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1">Admin Settings & RBAC Control</h1>
          <p className="text-purple-100 text-sm mt-1 max-w-xl">
            Manage admin credentials, consultant user accounts, role permissions, and live database sync.
          </p>
        </div>

        <button
          onClick={fetchLiveDatabaseData}
          disabled={isLoadingDb}
          className="relative z-10 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-2 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDb ? 'animate-spin' : ''}`} />
          <span>Sync with Database</span>
        </button>
      </div>

      {/* Section Container with Role Tabs */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
        {/* Navigation Tabs between Admin Users and Consultant Users */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'admins'
                  ? 'bg-white text-[#5e2be2] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Users ({adminUsers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('consultants')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'consultants'
                  ? 'bg-white text-[#5e2be2] shadow-sm font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Consultant Users ({consultantUsers.length})</span>
            </button>
          </div>

          {activeTab === 'admins' ? (
            <button
              onClick={handleOpenAddAdminModal}
              className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-[#5e2be2]/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Admin User
            </button>
          ) : (
            <button
              onClick={handleOpenAddConsultantModal}
              className="px-5 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-[#5e2be2]/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Consultant User
            </button>
          )}
        </div>

        {/* ── ADMIN USERS TAB ── */}
        {activeTab === 'admins' && (
          <div className="divide-y divide-slate-100">
            {adminUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No admin users found. Click <strong className="text-slate-700">Add Admin User</strong> to create one.
              </div>
            ) : (
              adminUsers.map((usr) => (
                <div key={usr.id} className="py-4 flex items-center justify-between flex-wrap gap-4 hover:bg-slate-50/50 px-3 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-[#5e2be2] flex items-center justify-center font-extrabold text-sm border border-purple-200/50 shadow-xs">
                      {usr.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {usr.name}
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                          {usr.id}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {usr.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-purple-50 text-[#5e2be2] font-bold text-xs rounded-full border border-purple-100/60 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {usr.role}
                    </span>

                    <button
                      onClick={() => handleToggleAdminStatus(usr.id)}
                      title="Click to toggle status"
                      className={`px-3 py-1 font-bold text-xs rounded-full transition-all cursor-pointer ${
                        usr.status === 'Active'
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                          : usr.status === 'Pending'
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {usr.status}
                    </button>

                    <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-3">
                      <button
                        onClick={() => handleOpenEditAdminModal(usr)}
                        title="Edit Admin"
                        className="p-2 text-slate-400 hover:text-[#5e2be2] hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(usr.id, usr.name)}
                        title="Delete Admin"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── CONSULTANT USERS TAB ── */}
        {activeTab === 'consultants' && (
          <div className="divide-y divide-slate-100">
            {consultantUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                No consultant users found. Click <strong className="text-slate-700">Add Consultant User</strong> to create one.
              </div>
            ) : (
              consultantUsers.map((usr) => (
                <div key={usr.id} className="py-4 flex items-center justify-between flex-wrap gap-4 hover:bg-slate-50/50 px-3 rounded-2xl transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-purple-100 text-[#5e2be2] flex items-center justify-center font-extrabold text-sm border border-purple-200/50 shadow-xs">
                      {usr.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        {usr.name}
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                          {usr.id}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {usr.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-full border border-amber-200/60 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-600" />
                      {usr.profession}
                    </span>

                    <button
                      onClick={() => handleToggleConsultantStatus(usr.id)}
                      title="Click to toggle status"
                      className={`px-3 py-1 font-bold text-xs rounded-full transition-all cursor-pointer ${
                        usr.status === 'Active'
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                          : usr.status === 'Pending'
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {usr.status}
                    </button>

                    <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-3">
                      <button
                        onClick={() => {
                          launchConsultantPanel({
                            id: usr.id,
                            name: usr.name,
                            email: usr.email,
                            role: 'therapist',
                            profession: usr.profession
                          });
                        }}
                        title="Launch Consultant Suite"
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditConsultantModal(usr)}
                        title="Edit Consultant"
                        className="p-2 text-slate-400 hover:text-[#5e2be2] hover:bg-purple-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConsultant(usr.id, usr.name)}
                        title="Delete Consultant"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: ADD / EDIT ADMIN USER ── */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5e2be2] text-white flex items-center justify-center shadow-md">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingAdmin ? 'Edit Admin User' : 'Add New Admin User'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure credentials & RBAC access role</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAdminSubmit} className="p-6 space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. Dr. Priya Sharma"
                    value={adminFormData.name}
                    onChange={(e) => {
                      setAdminFormData((prev) => ({ ...prev, name: e.target.value }));
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                      errors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-[#5e2be2]'
                    } rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2`}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    placeholder="e.g. priya.sharma@hexpertify.com"
                    value={adminFormData.email}
                    onChange={(e) => {
                      setAdminFormData((prev) => ({ ...prev, email: e.target.value }));
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                      errors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-[#5e2be2]'
                    } rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Admin Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Admin Role
                  </label>
                  <select
                    value={adminFormData.role}
                    onChange={(e) => setAdminFormData((prev) => ({ ...prev, role: e.target.value as AdminUser['role'] }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Finance Admin">Finance Admin</option>
                    <option value="Operations Admin">Operations Admin</option>
                    <option value="Clinical Admin">Clinical Admin</option>
                    <option value="Support Admin">Support Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={adminFormData.status}
                    onChange={(e) => setAdminFormData((prev) => ({ ...prev, status: e.target.value as AdminUser['status'] }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md shadow-[#5e2be2]/20 transition-all cursor-pointer"
                >
                  {editingAdmin ? 'Save Changes' : 'Create Admin User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT CONSULTANT USER ── */}
      {isConsultantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-amber-50 via-purple-50 to-indigo-50 border-b border-purple-100/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#5e2be2] text-white flex items-center justify-center shadow-md">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingConsultant ? 'Edit Consultant User' : 'Add New Consultant User'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure clinical credentials & live MongoDB Atlas persistence</p>
                </div>
              </div>
              <button
                onClick={() => setIsConsultantModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConsultantSubmit} className="p-6 space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. Dr. Evelyn Reed, PhD"
                    value={consultantFormData.name}
                    onChange={(e) => {
                      setConsultantFormData((prev) => ({ ...prev, name: e.target.value }));
                      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                      errors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-[#5e2be2]'
                    } rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2`}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    placeholder="e.g. dr.evelyn@hexpertify.com"
                    value={consultantFormData.email}
                    onChange={(e) => {
                      setConsultantFormData((prev) => ({ ...prev, email: e.target.value }));
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border ${
                      errors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-[#5e2be2]'
                    } rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2`}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Profession / Specialty & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Profession / Specialty <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      list="profession-options"
                      placeholder="e.g. Licensed Clinical Psychologist"
                      value={consultantFormData.profession}
                      onChange={(e) => {
                        setConsultantFormData((prev) => ({ ...prev, profession: e.target.value }));
                        if (errors.profession) setErrors((prev) => ({ ...prev, profession: undefined }));
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]"
                    />
                    <datalist id="profession-options">
                      <option value="Licensed Clinical Psychologist" />
                      <option value="Marriage & Family Therapist" />
                      <option value="Adolescent & Teen Counselor" />
                      <option value="Psychiatrist" />
                      <option value="CBT Specialist" />
                      <option value="Child Psychologist" />
                      <option value="Couples Counselor" />
                    </datalist>
                  </div>
                  {errors.profession && (
                    <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.profession}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status
                  </label>
                  <select
                    value={consultantFormData.status}
                    onChange={(e) => setConsultantFormData((prev) => ({ ...prev, status: e.target.value as ConsultantUser['status'] }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5e2be2]"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConsultantModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5e2be2] hover:bg-[#4f28d9] text-white font-bold text-xs rounded-xl shadow-md shadow-[#5e2be2]/20 transition-all cursor-pointer"
                >
                  {editingConsultant ? 'Save Changes' : 'Create in Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
