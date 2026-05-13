// helpers.js
export const fmtDate = (d) => {
  if (!d) return 'No date';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const daysLeft = (d) => {
  if (!d) return 'No date';
  const diff = Math.ceil((new Date(d) - new Date()) / 86_400_000);
  if (diff < 0)  return 'Overdue';
  if (diff === 0) return 'Due today';
  return `${diff}d left`;
};

export const TASK_STATUS = [
  { value: 'not done',   label: '⬜ Not Done',   cls: 'badge-todo'    },
  { value: 'in process', label: '🔄 In Process',  cls: 'badge-process' },
  { value: 'done',       label: '✅ Done',         cls: 'badge-done'    },
];

export const statusInfo = (value) =>
  TASK_STATUS.find((s) => s.value === value) ?? TASK_STATUS[0];