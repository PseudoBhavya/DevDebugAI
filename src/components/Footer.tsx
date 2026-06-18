export default function Footer() {
  return (
    <footer>
      <div className="footer-grid-bg" />
      <div className="footer-inner">
        <div className="footer-left">
          <span className="name">Bhavya Pandey</span>
          <span className="handle">$PseudoBhavya$</span>
          <span className="email">bhavyapandey446@gmail.com</span>
        </div>
        <div className="footer-right">
          <div className="footer-eyebrow">Sponsor</div>
          <a
            className="footer-btn"
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Built for Digital Heroes ↗
          </a>
          <div className="footer-sub">An initiative under the Digital Heroes ecosystem.</div>
        </div>
      </div>
    </footer>
  );
}
