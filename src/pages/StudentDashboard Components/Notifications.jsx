import React, { useState, useEffect } from 'react';

export default function NotificationsPage({ notifications, markAllRead }) {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title">🔔 All Notifications</span>
          {unread > 0 && <button className="btn btn-outline btn-sm" onClick={markAllRead}>Mark all as read</button>}
        </div>
        {notifications.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🔕</div><p>No notifications yet.</p></div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`} style={{ padding: '16px 20px' }}>
              <span className="notif-icon">{n.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: n.read ? 500 : 700 }}>{n.msg}</div>
                <div className="notif-time">{n.time}</div>
              </div>
              {!n.read && <span style={{ marginLeft: 'auto', width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%', flexShrink: 0, alignSelf: 'center' }} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}