import React from 'react';
import './StatusBadge.css';

function StatusBadge({ status }) {
  const getStatusInfo = (status) => {
    switch (status) {
      case 'selling':
        return {
          text: 'Selling',
          className: 'status-selling'
        };
      case 'in_transaction':
        return {
          text: 'In Transaction',
          className: 'status-in-transaction'
        };
      case 'sold':
        return {
          text: 'Sold',
          className: 'status-sold'
        };
      default:
        return {
          text: 'Selling',
          className: 'status-selling'
        };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <span className={`status-badge ${statusInfo.className}`}>
      {statusInfo.text}
    </span>
  );
}

export default StatusBadge;
