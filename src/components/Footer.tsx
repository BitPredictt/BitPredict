import { Github, ExternalLink, Zap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-16 pb-24 md:pb-8 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-xs text-gray-600 hover:text-btc transition-colors">Markets</a></li>
              <li><a href="#" className="text-xs text-gray-600 hover:text-btc transition-colors">Portfolio</a></li>
              <li><a href="#" className="text-xs text-gray-600 hover:text-btc transition-colors">Leaderboard</a></li>
              <li><a href="#" className="text-xs text-gray-600 hover:text-btc transition-colors">AI Analysis</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">OP_NET</h4>
            <ul className="space-y-2">
              <li><a href="https://dev.opnet.org" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-btc transition-colors flex items-center gap-1">Docs <ExternalLink size={8} /></a></li>
              <li><a href="https://faucet.opnet.org" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-btc transition-colors flex items-center gap-1">Faucet <ExternalLink size={8} /></a></li>
              <li><a href="https://opscan.org" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-btc transition-colors flex items-center gap-1">Explorer <ExternalLink size={8} /></a></li>
              <li><a href="https://ai.opnet.org/mcp" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-btc transition-colors flex items-center gap-1">Bob AI <ExternalLink size={8} /></a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Community</h4>
            <ul className="space-y-2">
              <li><a href="https://github.com/opbitpredict/BitPredict" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-btc transition-colors flex items-center gap-1"><Github size={10} /> GitHub</a></li>
              <li><a href="https://opnet.org" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-btc transition-colors flex items-center gap-1"><ExternalLink size={10} /> OP_NET</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tech Stack</h4>
            <ul className="space-y-2">
              <li className="text-xs text-gray-600">Bitcoin L1</li>
              <li className="text-xs text-gray-600">OP_NET + WASM</li>
              <li className="text-xs text-gray-600">AssemblyScript</li>
              <li className="text-xs text-gray-600">React + Vite</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-btc" />
            <span className="text-xs font-bold text-white">BitPredict</span>
            <span className="text-[10px] text-gray-600">© 2026</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-btc/10 text-btc px-2 py-0.5 rounded-full font-bold border border-btc/20">#opnetvibecode</span>
            <span className="text-[10px] text-gray-600">Built with Bob AI</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
