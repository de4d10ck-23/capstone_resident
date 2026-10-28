import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function PasswordField({ id, label, value, onChange, required, autoComplete, minLength, allowReveal = true, manualEntry = false }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
      <div className="relative">
        <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange}
          readOnly={manualEntry && !focused} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          data-lpignore={manualEntry ? 'true' : undefined} data-1p-ignore={manualEntry ? 'true' : undefined}
          placeholder={manualEntry ? 'Enter your current password' : undefined}
          required={required} minLength={minLength} autoComplete={autoComplete} className={`${inputClass} pr-12`} />
        {allowReveal && <button type="button" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible} className="absolute right-3 top-3 text-slate-500 p-0.5">
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const togglePasswordChange = () => {
    setChangingPassword(value => !value);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (fullName.trim().length < 2 || username.trim().length < 3) {
      setError('Enter a full name of at least 2 characters and a username of at least 3 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    if (changingPassword && (!newPassword.trim() || !currentPassword)) {
      setError('Enter your current password and a non-blank new password.');
      return;
    }
    setSaving(true);
    try {
      const saved = await updateProfile({
        full_name: fullName.trim(), username: username.trim(),
        ...(newPassword ? { current_password: currentPassword, new_password: newPassword } : {}),
      });
      setFullName(saved.full_name);
      setUsername(saved.username);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setChangingPassword(false);
      setSuccess('Profile saved. Use your updated username and password the next time you sign in.');
    } catch (err) {
      setError(err.message || 'Could not connect to the server. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-slate-900">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <UserRound size={24} className="mb-2 text-blue-700" />
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-600 mt-2 text-sm">Manage your personal details and password.</p>
      </div>
      <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p>}
        <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="full-name" className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
            <input id="full-name" required minLength={2} autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">Username *</label>
            <input id="username" required minLength={3} autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="barangay" className="block text-sm font-semibold text-slate-700 mb-2">Barangay</label>
            <input id="barangay" readOnly value={user?.barangay || 'Not assigned'} aria-describedby="barangay-help" className={`${inputClass} !bg-slate-100 text-slate-500`} />
            <p id="barangay-help" className="mt-2 text-xs text-slate-500 flex gap-1.5 items-center"><LockKeyhole size={14} />Your assigned barangay cannot be changed here.</p>
          </div>
          <div>
            <label htmlFor="profile-email" className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input id="profile-email" readOnly value={user?.email || ''} placeholder="Not provided" aria-describedby="email-help" className={`${inputClass} bg-slate-100! text-slate-500`} />
            <p id="email-help" className="mt-2 text-xs text-slate-500 flex gap-1.5 items-center"><LockKeyhole size={14} />Your email address cannot be changed here.</p>
          </div>
          </div>
          <div className="border-t border-slate-200 pt-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-bold text-slate-900">Password</h2><p className="text-sm text-slate-600 mt-1">Your saved password is never displayed.</p></div>
              <button type="button" onClick={togglePasswordChange} aria-expanded={changingPassword} aria-controls="password-fields" className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">{changingPassword ? 'Cancel Password Change' : 'Change Password'}</button>
            </div>
            {changingPassword && <div id="password-fields" className="space-y-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Enter your current password to verify this change. Your new password must have at least 6 characters.</p>
              <PasswordField id="profile-verification" label="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="off" allowReveal={false} manualEntry />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PasswordField id="new-password" label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                <PasswordField id="confirm-password" label="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
              </div>
            </div>}
          </div>
          <button type="submit" className="w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
        </fieldset>
      </form>
    </div>
  );
}
