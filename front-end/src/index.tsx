import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './global';
import './clojured-wallet';
import { PublicKey } from '@solana/web3.js';

window.sfsProgramId = new PublicKey('yX8ip4PTAZs261A7s5ZaZjzMYbPjEeRjWYArDA7sZjf');
window.sfsRoot = new PublicKey('6P4JL1Hc9d1pKnWHeV99Bq3BZRSLudCKM9fi1cCnp3sj');

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
