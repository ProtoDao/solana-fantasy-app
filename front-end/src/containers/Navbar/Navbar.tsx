import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

export function Navbar() {
  const [, forceRerender] = useState({});

  const walletChangeHook = () => {
    forceRerender({});
  };

  if (!window.walletStatusChangeHooks) {
    window.walletStatusChangeHooks = { navbar: walletChangeHook, walletPage: () => {} };
  } else {
    window.walletStatusChangeHooks.navbar = walletChangeHook;
  }

  return (
    <header id="header" className="fixed-top" style={{ backgroundColor: '#000' }}>
      <div className="container d-flex align-items-center">
        <h1 className="logo mr-auto">
          <Link to="/">SFS</Link>
        </h1>
        <nav className="nav-menu d-none d-lg-block">
          <ul>
            <NavElement to="/" label="Home" />
            <NavElement to="/leagues/create" label="Create a League" />
            <NavElement to="/leagues" label="Join a League" />
            {window.wallet &&
            window.wallet.publicKey.toBase58() ===
              '9AmX84PQg4PoyLwPCHbBy2mSRsjKo1CSJXVXXXfSWZTH' ? (
              <NavElement to="/admin" label="Admin Panel" />
            ) : null}
            {window.wallet === undefined ? (
              <NavElement to="/wallet/import" label="Connect Wallet" />
            ) : (
              <NavElement
                to="/wallet"
                label={`Welcome ${window.wallet.publicKey.toBase58().slice(0, 6)}...`}
              />
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function NavElement(props: { to: string; label: string }) {
  return (
    <NavLink to={props.to} activeClassName="active" exact>
      <label>{props.label}</label>
    </NavLink>
  );
}
