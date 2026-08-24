// Footer.jsx
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-emerald-200/60 bg-white/70 backdrop-blur-sm mt-10">
      <div className="max-w-7xl mx-auto px-4 py-4 text-center break-words">
        <h4 className="text-sm md:text-base text-emerald-700 font-medium">
          &copy; {year} Official registration portal • Developed by{" "}
          <a
            href="https://mulutilacodecomp.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-emerald-800 hover:text-emerald-700 underline underline-offset-4 transition"
          >
            MuluTilaCodeComp
          </a>
          .|.std.
        </h4>
      </div>
    </footer>
  );
}
