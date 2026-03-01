export const GlobalStyles = () => (
  <style jsx global>{`
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;600&display=swap');

    /* ── Animations ─────────────────────────────────────────────────────── */
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes fadeOut{from{opacity:1}to{opacity:0}}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes slideDown{from{transform:translateY(0)}to{transform:translateY(100%)}}
    @keyframes load{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes shimmerSweep{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-0.5rem)}}
    @keyframes slideDown2{from{transform:translate(-50%,-100%);opacity:0}to{transform:translate(-50%,0);opacity:1}}

    /* ── Base ───────────────────────────────────────────────────────────── */
    *{box-sizing:border-box}
    body{
      background:#000;
      color:#fff;
      font-family:'Inter',sans-serif;
      margin:0;
      padding:0;
    }

    /* ── Skeleton & loading ─────────────────────────────────────────────── */
    .skeleton{
      background:linear-gradient(90deg,#1a1a1a 25%,#2a2a2a 50%,#1a1a1a 75%);
      background-size:200% 100%;
      animation:load 1.5s ease-in-out infinite
    }
    .animate-spin{animation:spin 1s linear infinite}
    .animate-bounce{animation:bounce 1s infinite}

    /* ── Card hover ─────────────────────────────────────────────────────── */
    .card-overlay{opacity:0;transition:opacity .3s}
    .card:hover .card-overlay{opacity:1}
    .card{transition:transform .3s ease}
    .card:hover{transform:translateY(-4px)}

    /* ── Masonry grid ───────────────────────────────────────────────────── */
    .masonry{column-count:2;column-gap:10px}
    @media(min-width:480px){.masonry{column-count:2;column-gap:12px}}
    @media(min-width:640px){.masonry{column-count:3;column-gap:12px}}
    @media(min-width:1024px){.masonry{column-count:3;column-gap:14px}}
    @media(min-width:1280px){.masonry{column-count:4;column-gap:14px}}
    @media(min-width:1536px){.masonry{column-count:5;column-gap:14px}}
    .masonry>div{break-inside:avoid;margin-bottom:12px}

    /* ── Sidebar layout offset ──────────────────────────────────────────── */
    /* Desktop: push content right to make room for 220px sidebar */
    @media(min-width:1024px){
      .sidebar-offset{margin-left:220px}
    }

    /* ── Scrollbar hide ─────────────────────────────────────────────────── */
    .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
    .scrollbar-hide::-webkit-scrollbar{display:none}
    .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
    .no-scrollbar::-webkit-scrollbar{display:none}

    /* ── Typography utils ───────────────────────────────────────────────── */
    .line-clamp-1{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
    .font-syne{font-family:'Syne',sans-serif}
    .font-inter{font-family:'Inter',sans-serif}

    /* ── Animation utils ────────────────────────────────────────────────── */
    .slide-up{animation:slideUp 0.3s ease-out forwards}
    .slide-down{animation:slideDown 0.3s ease-out forwards}
    .fade-in{animation:fadeIn 0.2s ease forwards}

    /* ── Splash screen ──────────────────────────────────────────────────── */
    .splash-screen{
      position:fixed;top:0;left:0;
      width:100vw;height:100vh;
      background:#000;
      display:flex;align-items:center;justify-content:center;
      z-index:9999;
      animation:fadeOut 0.8s ease-out 5.5s forwards
    }
    .splash-loader{
      width:240px;height:3px;
      background:rgba(255,255,255,0.08);
      border-radius:2px;overflow:hidden
    }
    .splash-loader-bar{
      height:100%;background:#fff;
      animation:load 5.5s ease-in-out forwards;
      border-radius:2px
    }

    /* ── Skeleton shimmer ───────────────────────────────────────────────── */
    .skeleton-shimmer{
      background:linear-gradient(
        90deg,
        rgba(255,255,255,0.03) 0%,
        rgba(255,255,255,0.08) 50%,
        rgba(255,255,255,0.03) 100%
      );
      background-size:200% 100%;
      animation:shimmerSweep 2s ease-in-out infinite
    }
  `}</style>
);
