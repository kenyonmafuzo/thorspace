import React from "react";

const iconStyle = {
  width: 18,
  height: 18,
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: 6,
  opacity: 0.6,
  transition: "opacity 0.2s, filter 0.2s",
  filter: "drop-shadow(0 0 0px #fff)"
};

const hoverStyle = {
  opacity: 1,
  filter: "drop-shadow(0 0 4px #fff)"
};

const linkStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  color: "inherit"
};

const handle = "@ThorspaceGame";

export default function SocialLinksMini() {
  const [hoverX, setHoverX] = React.useState(false);
  const [hoverIG, setHoverIG] = React.useState(false);
  const [hoverYT, setHoverYT] = React.useState(false);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, opacity: 0.6 }}>
      <a
        href="https://x.com/ThorspaceGame"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        onMouseEnter={() => setHoverX(true)}
        onMouseLeave={() => setHoverX(false)}
      >
        <span style={hoverX ? { ...iconStyle, ...hoverStyle } : iconStyle}>
          {/* X SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.53 3H21L13.91 10.62L22.25 21H16.16L10.97 14.37L4.99 21H1.01L8.57 12.94L0.5 3H6.76L11.52 9.13L17.53 3ZM16.41 19.13H18.23L6.42 4.77H4.48L16.41 19.13Z" fill="currentColor"/>
          </svg>
        </span>
      </a>
      <a
        href="https://instagram.com/ThorspaceGame"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        onMouseEnter={() => setHoverIG(true)}
        onMouseLeave={() => setHoverIG(false)}
      >
        <span style={hoverIG ? { ...iconStyle, ...hoverStyle } : iconStyle}>
          {/* Instagram SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
            <circle cx="17" cy="7" r="1.5" fill="currentColor"/>
          </svg>
        </span>
      </a>
      <a
        href="https://www.youtube.com/@Thorspace"
        target="_blank"
        rel="noopener noreferrer"
        style={linkStyle}
        onMouseEnter={() => setHoverYT(true)}
        onMouseLeave={() => setHoverYT(false)}
      >
        <span style={hoverYT ? { ...iconStyle, ...hoverStyle } : iconStyle}>
          {/* YouTube SVG */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.58 7.19a2.76 2.76 0 0 0-1.94-1.95C18.01 4.75 12 4.75 12 4.75s-6.01 0-7.64.49A2.76 2.76 0 0 0 2.42 7.19 28.9 28.9 0 0 0 2 12a28.9 28.9 0 0 0 .42 4.81 2.76 2.76 0 0 0 1.94 1.95c1.63.49 7.64.49 7.64.49s6.01 0 7.64-.49a2.76 2.76 0 0 0 1.94-1.95A28.9 28.9 0 0 0 22 12a28.9 28.9 0 0 0-.42-4.81Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M10 15.5v-7l6 3.5-6 3.5Z" fill="currentColor"/>
          </svg>
        </span>
      </a>
      <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 2 }}>{handle}</span>
    </div>
  );
}
