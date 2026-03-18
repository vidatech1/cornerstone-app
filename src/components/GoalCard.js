// src/components/GoalCard.js — Cornerstone Goal Card
window.GoalCard = function ({ goal, accounts, onEdit, onRemove }) {
  const { T, F } = React.useContext(AppCtx);
  const linked  = accounts.filter(a => (goal.accountIds || []).includes(a.id));
  const current = sumArr(linked.map(a => a.amount));
  let pct, statusColor, statusText;
  
  if (goal.isDebtGoal) {
    const start = goal._startAmount || current;
    pct = start > 0 ? Math.max(0, Math.min(100, (1 - current / start) * 100)) : 100;
    statusColor = pct >= 100 ? T.accentBright : pct > 50 ? T.accent : T.accentDim;
    statusText  = current <= 0 ? '✓ Paid off!' : `${fmtD(current)} remaining`;
  } else {
    pct = goal.targetAmount > 0 ? Math.min((current / goal.targetAmount) * 100, 100) : 0;
    statusColor = pct >= 100 ? T.accentBright : pct > 66 ? T.accent : T.accentDim;
    statusText  = pct >= 100 ? '✓ Goal reached!' : `${fmt(current)} / ${fmt(goal.targetAmount)}`;
  }
  
  const handleEdit = () => {
    if (window.playClick) window.playClick();
    onEdit(goal);
  };
  
  const handleRemove = () => {
    if (window.playClick) window.playClick();
    if (confirm('Remove this goal?')) onRemove(goal.id);
  };
  
  return React.createElement(Card, { 
    hover: true, 
    style: { 
      padding: '20px 22px', 
      marginBottom: 12, 
      border: `1px solid ${T.borderLight}` 
    } 
  },
    // Header row
    React.createElement('div', { 
      style: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: 14 
      } 
    },
      React.createElement('div', { style: { flex: 1 } },
        React.createElement('div', { 
          style: { 
            fontFamily: "'Playfair Display', serif", 
            fontWeight: 500, 
            fontSize: F.md, 
            color: T.text, 
            marginBottom: 4 
          } 
        }, goal.label),
        goal.targetDate && React.createElement('div', { 
          style: { 
            fontFamily: "'Inter', sans-serif", 
            fontSize: F.xs, 
            color: T.textMuted 
          } 
        }, `Target: ${new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`),
      ),
      React.createElement('span', { 
        style: { 
          fontFamily: "'Inter', sans-serif", 
          fontSize: F.sm, 
          color: T.textSub 
        } 
      }, statusText),
    ),
    
    // Progress bar
    React.createElement('div', { 
      style: { 
        height: 5, 
        background: T.border, 
        borderRadius: 3, 
        overflow: 'hidden', 
        marginBottom: 10 
      } 
    },
      React.createElement('div', { 
        style: { 
          height: '100%', 
          width: `${pct}%`, 
          background: statusColor, 
          borderRadius: 3, 
          transition: 'width 0.6s ease' 
        } 
      }),
    ),
    
    // Meta row
    React.createElement('div', { 
      style: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      } 
    },
      React.createElement('span', { 
        style: { 
          fontFamily: "'Inter', sans-serif", 
          fontSize: F.xs, 
          color: T.textMuted 
        } 
      }, `${pct.toFixed(0)}% complete`),
      React.createElement('div', { style: { display: 'flex', gap: 8 } },
        React.createElement('button', { 
          onClick: handleEdit, 
          style: { 
            background: 'transparent', 
            border: 'none', 
            color: T.textMuted, 
            fontSize: F.xs, 
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'all 0.2s',
          } 
        }, 'Edit'),
        React.createElement('button', { 
          onClick: handleRemove, 
          style: { 
            background: 'transparent', 
            border: 'none', 
            color: T.textMuted, 
            fontSize: F.xs, 
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            transition: 'all 0.2s',
          } 
        }, '✕'),
      ),
    ),
    
    // Notes
    goal.notes && React.createElement('div', { 
      style: { 
        fontFamily: "'Inter', sans-serif", 
        fontSize: F.xs, 
        color: T.textMuted, 
        marginTop: 12, 
        lineHeight: 1.6,
        fontStyle: 'italic',
      } 
    }, goal.notes),
    
    // Linked accounts
    linked.length > 0 && React.createElement('div', { 
      style: { 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 6, 
        marginTop: 12 
      } 
    },
      ...linked.map(a => React.createElement('span', { 
        key: a.id, 
        style: { 
          fontSize: F.xs - 1, 
          fontFamily: "'Inter', sans-serif", 
          background: T.accentGlow, 
          border: `1px solid ${T.border}`, 
          borderRadius: 8, 
          padding: '3px 10px', 
          color: T.textSub 
        } 
      }, a.label))
    ),
  );
};
