class CustomNavbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="bg-slate-900 text-white p-3 shadow-xl border-b border-slate-800 relative z-50">
                <div class="container mx-auto flex justify-between items-center">
                    <a href="index.html" class="flex items-center gap-3 hover:opacity-90 transition">
                        <img src="assets/logo.png" alt="מלך הזולה" class="h-12 md:h-14 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    </a>
                    
                    <div class="hidden md:flex items-center gap-4 text-sm font-bold">
                        </div>
                </div>
            </nav>
        `;
    }
}

customElements.define('custom-navbar', CustomNavbar);
