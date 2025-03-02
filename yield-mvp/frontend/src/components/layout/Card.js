import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

export const Card = ({
  children,
  title,
  subtitle,
  loading = false,
  error = null,
  className = '',
}) => {
  const classes = ['card', className, loading ? 'card-loading' : ''].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={classes}>
        <div className="card-skeleton">
          <div className="skeleton-title"></div>
          <div className="skeleton-content"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card-error">
        <div className="error-content">
          <span className="error-icon">⚠</span>
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={classes}>
      {(title || subtitle) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  className: PropTypes.string,
};
