import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const fileRef = useRef(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
  });
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(user?.avatarUrl || null);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');

  const updateProfile = useMutation({
    mutationFn: (fd) => authApi.updateProfile(fd),
    onSuccess: ({ data }) => {
      updateUser(data);
      setAvatar(null);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const changePassword = useMutation({
    mutationFn: (data) => authApi.changePassword(data),
    onSuccess: () => {
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setPwError('');
      toast.success('Password changed');
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Failed to change password';
      setPwError(msg);
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', profileForm.name);
    fd.append('bio', profileForm.bio);
    if (avatar) fd.append('avatar', avatar);
    updateProfile.mutate(fd);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    changePassword.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-cream">Settings</h1>
        <p className="text-muted text-sm mt-1">Manage your admin account</p>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-cream mb-5">Profile</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div className="flex items-center gap-5">
            <div
              className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold flex-shrink-0 cursor-pointer overflow-hidden border-2 border-border hover:border-accent transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-sm">
                Change Photo
              </button>
              <p className="text-xs text-muted mt-1">JPG, PNG up to 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div>
            <label className="label">Display Name</label>
            <input
              className="input"
              value={profileForm.name}
              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Tell your members a bit about yourself…"
              value={profileForm.bio}
              onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input className="input opacity-60 cursor-not-allowed" value={user?.email || ''} disabled />
            <p className="text-xs text-muted mt-1">Email cannot be changed here.</p>
          </div>

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
              {updateProfile.isPending ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-cream mb-5">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              required
            />
          </div>
          {pwError && <p className="text-sm text-red-400">{pwError}</p>}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={changePassword.isPending} className="btn-primary">
              {changePassword.isPending ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-cream mb-2">Account Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">Role</span>
            <span className="text-cream font-medium capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted">Tier</span>
            <span className={`badge-${user?.tier}`}>{user?.tier}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted">Member since</span>
            <span className="text-cream">{user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
