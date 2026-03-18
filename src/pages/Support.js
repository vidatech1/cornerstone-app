// src/pages/Support.js — Support & Membership Page
const { useState, useContext } = React;

window.SupportPage = function ({ profile }) {
  const { T, F } = useContext(AppCtx);
  
  const [form, setForm] = useState({
    name: profile?.name || '',
    email: '',
    phone: '',
    membershipStatus: 'free',
    issueType: 'question',
    message: '',
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const ISSUE_TYPES = [
    { value: 'question', label: 'General Question', icon: '❓' },
    { value: 'bug', label: 'Bug Report', icon: '🐛' },
    { value: 'feature', label: 'Feature Request', icon: '💡' },
    { value: 'account', label: 'Account Issue', icon: '👤' },
    { value: 'billing', label: 'Billing/Membership', icon: '💳' },
    { value: 'other', label: 'Other', icon: '📝' },
  ];

  const MEMBERSHIP_OPTIONS = [
    { value: 'free', label: 'Free User' },
    { value: 'basic', label: 'Basic Member' },
    { value: 'premium', label: 'Premium Member' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    // Validate
    if (!form.name.trim()) { setError('Please enter your name'); return; }
    if (!form.email.trim() || !form.email.includes('@')) { setError('Please enter a valid email'); return; }
    if (!form.message.trim()) { setError('Please describe your issue or request'); return; }

    if (window.playClick) window.playClick();
    setSubmitting(true);
    setError('');

    // Build email content
    const subject = `[Cornerstone Support] ${ISSUE_TYPES.find(t => t.value === form.issueType)?.label} from ${form.name}`;
    const body = `
Support Request from Cornerstone App
=====================================

Name: ${form.name}
Email: ${form.email}
Phone: ${form.phone || 'Not provided'}
Membership Status: ${MEMBERSHIP_OPTIONS.find(m => m.value === form.membershipStatus)?.label}
Issue Type: ${ISSUE_TYPES.find(t => t.value === form.issueType)?.label}

Message:
${form.message}

---
Sent from Cornerstone App v1.0.0
    `.trim();

    // Open mailto link (this will open the user's email client)
    const mailtoLink = `mailto:info@vidatech1.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Try to open email client
    window.open(mailtoLink, '_blank');
    
    // Show success state
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      if (window.playSuccess) window.playSuccess();
    }, 500);
  };

  const resetForm = () => {
    setForm({
      name: profile?.name || '',
      email: '',
      phone: '',
      membershipStatus: 'free',
      issueType: 'question',
      message: '',
    });
    setSubmitted(false);
    setError('');
  };

  const iStyle = inputStyle(T, F);

  return React.createElement('div', {
    className: 'fade-up',
    style: { padding: '24px 18px 120px', background: T.bg, minHeight: '100vh' }
  },
    // Header
    React.createElement('div', { style: { marginBottom: 28 } },
      React.createElement('div', { style: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: T.accent, marginBottom: 6 } }, 'Help & Community'),
      React.createElement('h1', { style: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 500, color: T.text, marginBottom: 8 } }, 'Support'),
      React.createElement('p', { style: { fontSize: F.sm, color: T.textSub, lineHeight: 1.5 } }, 'Get help or connect with VidaTech'),
    ),

    // Contact Form Card
    React.createElement(Card, { style: { padding: '24px 22px', marginBottom: 20 } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.lg, color: T.text, marginBottom: 6 } }, '📬 Contact Us'),
      React.createElement('div', { style: { fontSize: F.sm, color: T.textSub, marginBottom: 20 } }, 'We typically respond within 24-48 hours'),

      submitted 
        ? React.createElement('div', { style: { textAlign: 'center', padding: '30px 20px' } },
            React.createElement('div', { style: { fontSize: 48, marginBottom: 16 } }, '✅'),
            React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.lg, color: T.text, marginBottom: 8 } }, 'Message Ready to Send'),
            React.createElement('div', { style: { fontSize: F.sm, color: T.textSub, marginBottom: 20, lineHeight: 1.6 } }, 
              'Your email app should have opened with your message. Click send to complete your request.'
            ),
            React.createElement(Btn, { onClick: resetForm, variant: 'ghost' }, 'Send Another Message'),
          )
        : React.createElement(React.Fragment, null,
            error && React.createElement('div', { style: { background: 'rgba(212,148,58,0.12)', border: `1px solid ${T.accent}55`, borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: F.sm, color: T.accent } }, error),

            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 } },
              React.createElement('div', null,
                React.createElement(Lbl, null, 'Your Name *'),
                React.createElement('input', { value: form.name, onChange: e => updateForm('name', e.target.value), placeholder: 'John Doe', style: iStyle }),
              ),
              React.createElement('div', null,
                React.createElement(Lbl, null, 'Email *'),
                React.createElement('input', { type: 'email', value: form.email, onChange: e => updateForm('email', e.target.value), placeholder: 'you@email.com', style: iStyle }),
              ),
            ),

            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 } },
              React.createElement('div', null,
                React.createElement(Lbl, null, 'Phone (optional)'),
                React.createElement('input', { type: 'tel', value: form.phone, onChange: e => updateForm('phone', e.target.value), placeholder: '(555) 123-4567', style: iStyle }),
              ),
              React.createElement('div', null,
                React.createElement(Lbl, null, 'Membership Status'),
                React.createElement('select', { value: form.membershipStatus, onChange: e => updateForm('membershipStatus', e.target.value), style: { ...iStyle, cursor: 'pointer' } },
                  ...MEMBERSHIP_OPTIONS.map(m => React.createElement('option', { key: m.value, value: m.value }, m.label))
                ),
              ),
            ),

            React.createElement('div', { style: { marginBottom: 14 } },
              React.createElement(Lbl, null, 'Issue Type'),
              React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 } },
                ...ISSUE_TYPES.map(type => React.createElement('button', {
                  key: type.value,
                  onClick: () => { if (window.playClick) window.playClick(); updateForm('issueType', type.value); },
                  style: {
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `1px solid ${form.issueType === type.value ? T.accent : T.border}`,
                    background: form.issueType === type.value ? T.accentGlow : 'transparent',
                    color: form.issueType === type.value ? T.accent : T.textMuted,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: F.xs,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }
                }, type.icon + ' ' + type.label))
              ),
            ),

            React.createElement('div', { style: { marginBottom: 20 } },
              React.createElement(Lbl, null, 'Message *'),
              React.createElement('textarea', {
                value: form.message,
                onChange: e => updateForm('message', e.target.value),
                placeholder: 'Describe your issue, question, or request...',
                rows: 4,
                style: { ...iStyle, resize: 'vertical', minHeight: 100 },
              }),
            ),

            React.createElement(Btn, {
              onClick: handleSubmit,
              disabled: submitting,
              style: { width: '100%', padding: '14px' },
            }, submitting ? 'Preparing...' : 'Send Message'),
          ),
    ),

    // Membership Section
    React.createElement(Card, { style: { padding: '24px 22px', marginBottom: 20 } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.lg, color: T.text, marginBottom: 6 } }, '⭐ Premium Membership'),
      React.createElement('div', { style: { fontSize: F.sm, color: T.textSub, marginBottom: 20, lineHeight: 1.6 } }, 
        'Unlock advanced features, priority support, and exclusive financial coaching'
      ),

      React.createElement('div', { style: { display: 'grid', gap: 12, marginBottom: 20 } },
        ...['📊 Advanced analytics & projections', '🎯 Personalized coaching sessions', '📱 Priority support response', '🔒 Enhanced security features', '📈 Exclusive investment insights'].map((feature, i) => 
          React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, fontSize: F.sm, color: T.text } }, feature)
        ),
      ),

      React.createElement(Btn, {
        onClick: () => {
          if (window.playClick) window.playClick();
          window.open('https://bio.site/vidatech1', '_blank');
        },
        style: { width: '100%', padding: '14px' },
      }, 'Learn About Membership →'),
    ),

    // Quick Links
    React.createElement(Card, { style: { padding: '20px 22px' } },
      React.createElement('div', { style: { fontFamily: "'Playfair Display', serif", fontSize: F.md, color: T.text, marginBottom: 14 } }, '🔗 Quick Links'),
      
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        React.createElement('button', {
          onClick: () => window.open('https://bio.site/vidatech1', '_blank'),
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: T.surfaceAlt, border: `1px solid ${T.border}`,
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
          }
        },
          React.createElement('span', { style: { fontSize: F.sm, color: T.text } }, '🌐 VidaTech Website'),
          React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted } }, '→'),
        ),
        
        React.createElement('button', {
          onClick: () => {
            const mailto = 'mailto:info@vidatech1.com?subject=Cornerstone%20Inquiry';
            window.open(mailto, '_blank');
          },
          style: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', background: T.surfaceAlt, border: `1px solid ${T.border}`,
            borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
          }
        },
          React.createElement('span', { style: { fontSize: F.sm, color: T.text } }, '📧 Email Us Directly'),
          React.createElement('span', { style: { fontSize: F.xs, color: T.textMuted } }, 'info@vidatech1.com'),
        ),
      ),
    ),

    // Version Info
    React.createElement('div', { style: { textAlign: 'center', marginTop: 32, color: T.textMuted, fontSize: F.xs } },
      React.createElement('div', null, 'Cornerstone v1.0.0'),
      React.createElement('div', { style: { marginTop: 4 } }, '© 2025 VidaTech. All rights reserved.'),
    ),
  );
};
