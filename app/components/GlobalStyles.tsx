export const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes fadeOut{from{opacity:1}to{opacity:0}}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes slideDown{from{transform:translateY(0)}to{transform:translateY(100%)}}
    @keyframes load{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .skeleton{background:linear-gradient(90deg,#1a1a1a 25%,#2a2a2a 50%,#1a1a1a 75%);background-size:200% 100%;animation:load 1.5s ease-in-out infinite}
    .animate-spin{animation:spin 1s linear infinite}
    .card-overlay{opacity:0;transition:opacity .3s}
    .card:hover .card-overlay{opacity:1}
    .card{transition:transform .3s ease}
    .card:hover{transform:translateY(-8px)}
    .masonry{column-count:2;column-gap:1rem}
    @media(min-width:640px){.masonry{column-count:3}}
    @media(min-width:1024px){.masonry{column-count:4}}
    @media(min-width:1280px){.masonry{column-count:5}}
    .masonry>div{break-inside:avoid;margin-bottom:1rem}
    .line-clamp-1{display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
    .no-scrollbar::-webkit-scrollbar{display:none}
    .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
    .slide-up{animation:slideUp 0.3s ease-out forwards}
    .slide-down{animation:slideDown 0.3s ease-out forwards}
  `}</style>
);
