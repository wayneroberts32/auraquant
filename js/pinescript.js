/**
 * AuraQuant Infinity - Pine Script Editor Module
 * Advanced Pine Script development environment
 */

import { Config } from './config.js';
import { showNotification, getAuthToken } from './main.js';

export class PineScriptEditor {
    constructor() {
        this.editor = null;
        this.scripts = new Map();
        this.currentScript = null;
        this.libraries = new Map();
        this.indicators = new Map();
        this.strategies = new Map();
        this.syntaxHighlighter = null;
        this.autocomplete = null;
        this.linter = null;
        this.compiler = null;
    }

    /**
     * Initialize Pine Script editor
     */
    async initialize() {
        try {
            console.log('Initializing Pine Script editor...');
            
            // Initialize Monaco Editor
            await this.initializeMonaco();
            
            // Load Pine Script libraries
            await this.loadLibraries();
            
            // Load saved scripts
            await this.loadScripts();
            
            // Initialize syntax highlighting
            this.initializeSyntax();
            
            // Initialize autocomplete
            this.initializeAutocomplete();
            
            // Initialize linter
            this.initializeLinter();
            
            // Initialize UI
            this.initializeUI();
            
            console.log('✅ Pine Script editor initialized');
            
        } catch (error) {
            console.error('Pine Script editor initialization failed:', error);
        }
    }

    /**
     * Initialize Monaco Editor
     */
    async initializeMonaco() {
        return new Promise((resolve, reject) => {
            require(['vs/editor/editor.main'], () => {
                // Register Pine Script language
                monaco.languages.register({ id: 'pinescript' });
                
                // Set language configuration
                monaco.languages.setLanguageConfiguration('pinescript', {
                    comments: {
                        lineComment: '//',
                        blockComment: ['/*', '*/']
                    },
                    brackets: [
                        ['{', '}'],
                        ['[', ']'],
                        ['(', ')']
                    ],
                    autoClosingPairs: [
                        { open: '{', close: '}' },
                        { open: '[', close: ']' },
                        { open: '(', close: ')' },
                        { open: '"', close: '"' },
                        { open: "'", close: "'" }
                    ]
                });
                
                // Set token provider for syntax highlighting
                monaco.languages.setMonarchTokensProvider('pinescript', this.getPineScriptTokens());
                
                // Create editor instance
                this.editor = monaco.editor.create(document.getElementById('pinescript-editor'), {
                    value: this.getDefaultScript(),
                    language: 'pinescript',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    minimap: { enabled: true },
                    fontSize: 14,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    renderWhitespace: 'selection',
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    folding: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all'
                });
                
                // Add keyboard shortcuts
                this.addKeyboardShortcuts();
                
                resolve();
            });
        });
    }

    /**
     * Get Pine Script token provider
     */
    getPineScriptTokens() {
        return {
            keywords: [
                'var', 'varip', 'int', 'float', 'bool', 'color', 'string', 'line', 'label',
                'box', 'table', 'array', 'matrix', 'if', 'else', 'for', 'while', 'switch',
                'strategy', 'indicator', 'library', 'import', 'export', 'method', 'type'
            ],
            
            builtinFunctions: [
                'plot', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'hline', 'fill',
                'bgcolor', 'barcolor', 'alert', 'alertcondition', 'strategy.entry',
                'strategy.exit', 'strategy.close', 'strategy.cancel', 'ta.sma', 'ta.ema',
                'ta.rsi', 'ta.macd', 'ta.bb', 'ta.atr', 'ta.stoch', 'ta.cci', 'ta.wma',
                'ta.vwma', 'ta.vwap', 'ta.crossover', 'ta.crossunder', 'ta.change'
            ],
            
            operators: [
                '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
                '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
                '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
                '%=', '<<=', '>>=', '>>>='
            ],
            
            tokenizer: {
                root: [
                    // Comments
                    [/\/\/.*$/, 'comment'],
                    [/\/\*/, 'comment', '@comment'],
                    
                    // Version
                    [/@version=\d+/, 'annotation'],
                    
                    // Keywords
                    [/\b(var|varip|int|float|bool|color|string|line|label|box|table|array|matrix)\b/, 'type'],
                    [/\b(if|else|for|while|switch|case|default|break|continue|return)\b/, 'keyword'],
                    [/\b(strategy|indicator|library|import|export|method|type)\b/, 'keyword.declaration'],
                    
                    // Built-in functions
                    [/\b(plot|plotshape|plotchar|plotarrow|plotbar|hline|fill|bgcolor|barcolor)\b/, 'support.function'],
                    [/\b(alert|alertcondition)\b/, 'support.function'],
                    [/\b(strategy\.\w+)\b/, 'support.function'],
                    [/\b(ta\.\w+)\b/, 'support.function'],
                    [/\b(math\.\w+)\b/, 'support.function'],
                    [/\b(request\.\w+)\b/, 'support.function'],
                    
                    // Variables
                    [/\b(open|high|low|close|volume|time|bar_index|timenow)\b/, 'variable.language'],
                    [/\b(na|true|false)\b/, 'constant.language'],
                    
                    // Numbers
                    [/\b\d+\.?\d*([eE][+-]?\d+)?\b/, 'number'],
                    
                    // Strings
                    [/"([^"\\]|\\.)*"/, 'string'],
                    [/'([^'\\]|\\.)*'/, 'string'],
                    
                    // Operators
                    [/[+\-*/%=<>!&|^~?:]+/, 'operator'],
                    
                    // Identifiers
                    [/[a-zA-Z_]\w*/, 'identifier']
                ],
                
                comment: [
                    [/[^\/*]+/, 'comment'],
                    [/\*\//, 'comment', '@pop'],
                    [/[\/*]/, 'comment']
                ]
            }
        };
    }

    /**
     * Get default Pine Script
     */
    getDefaultScript() {
        return `//@version=5
indicator("AuraQuant Custom Indicator", overlay=true)

// Input parameters
length = input.int(14, "RSI Length", minval=1)
overbought = input.float(70, "Overbought Level")
oversold = input.float(30, "Oversold Level")

// Calculate RSI
rsi = ta.rsi(close, length)

// Plot signals
bullishSignal = ta.crossover(rsi, oversold)
bearishSignal = ta.crossunder(rsi, overbought)

plotshape(bullishSignal, title="Bullish Signal", location=location.belowbar, 
          color=color.green, style=shape.triangleup, size=size.small)
plotshape(bearishSignal, title="Bearish Signal", location=location.abovebar,
          color=color.red, style=shape.triangledown, size=size.small)

// Alerts
alertcondition(bullishSignal, title="Bullish RSI Signal", message="RSI crossed above oversold")
alertcondition(bearishSignal, title="Bearish RSI Signal", message="RSI crossed below overbought")`;
    }

    /**
     * Initialize syntax highlighting
     */
    initializeSyntax() {
        // Register completion provider
        monaco.languages.registerCompletionItemProvider('pinescript', {
            provideCompletionItems: (model, position) => {
                return this.getCompletionItems(model, position);
            }
        });
        
        // Register hover provider
        monaco.languages.registerHoverProvider('pinescript', {
            provideHover: (model, position) => {
                return this.getHoverInfo(model, position);
            }
        });
        
        // Register signature help provider
        monaco.languages.registerSignatureHelpProvider('pinescript', {
            signatureHelpTriggerCharacters: ['(', ','],
            provideSignatureHelp: (model, position) => {
                return this.getSignatureHelp(model, position);
            }
        });
    }

    /**
     * Initialize autocomplete
     */
    initializeAutocomplete() {
        this.autocomplete = new PineScriptAutocomplete();
        
        // Load function definitions
        this.autocomplete.loadFunctions();
        
        // Load variable definitions
        this.autocomplete.loadVariables();
        
        // Load snippets
        this.loadSnippets();
    }

    /**
     * Get completion items
     */
    getCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
        };
        
        const suggestions = [];
        
        // Add built-in functions
        this.autocomplete.functions.forEach((func, name) => {
            suggestions.push({
                label: name,
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: func.description,
                insertText: func.snippet,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: range
            });
        });
        
        // Add variables
        this.autocomplete.variables.forEach((variable, name) => {
            suggestions.push({
                label: name,
                kind: monaco.languages.CompletionItemKind.Variable,
                documentation: variable.description,
                insertText: name,
                range: range
            });
        });
        
        // Add snippets
        this.autocomplete.snippets.forEach((snippet, name) => {
            suggestions.push({
                label: name,
                kind: monaco.languages.CompletionItemKind.Snippet,
                documentation: snippet.description,
                insertText: snippet.code,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: range
            });
        });
        
        return { suggestions };
    }

    /**
     * Initialize linter
     */
    initializeLinter() {
        this.linter = new PineScriptLinter();
        
        // Listen for content changes
        this.editor.onDidChangeModelContent(() => {
            this.lintScript();
        });
    }

    /**
     * Lint script
     */
    async lintScript() {
        const code = this.editor.getValue();
        const errors = await this.linter.check(code);
        
        // Convert to Monaco markers
        const markers = errors.map(error => ({
            severity: error.severity === 'error' ? 
                monaco.MarkerSeverity.Error : 
                monaco.MarkerSeverity.Warning,
            startLineNumber: error.line,
            startColumn: error.column,
            endLineNumber: error.line,
            endColumn: error.column + error.length,
            message: error.message
        }));
        
        // Set markers
        monaco.editor.setModelMarkers(
            this.editor.getModel(),
            'pinescript',
            markers
        );
    }

    /**
     * Compile script
     */
    async compileScript() {
        const code = this.editor.getValue();
        
        try {
            showNotification('Compiling script...', 'info');
            
            const response = await fetch(`${Config.API_BASE_URL}/pinescript/compile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ code })
            });
            
            if (!response.ok) {
                throw new Error(`Compilation failed: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('✅ Script compiled successfully', 'success');
                return result.compiled;
            } else {
                showNotification(`❌ Compilation error: ${result.error}`, 'error');
                return null;
            }
            
        } catch (error) {
            showNotification(`Failed to compile: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Run backtest
     */
    async runBacktest() {
        const compiled = await this.compileScript();
        if (!compiled) return;
        
        try {
            showNotification('Running backtest...', 'info');
            
            const response = await fetch(`${Config.API_BASE_URL}/pinescript/backtest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({
                    script: compiled,
                    symbol: document.getElementById('backtest-symbol').value || 'AAPL',
                    timeframe: document.getElementById('backtest-timeframe').value || '1D',
                    startDate: document.getElementById('backtest-start').value,
                    endDate: document.getElementById('backtest-end').value
                })
            });
            
            if (!response.ok) {
                throw new Error(`Backtest failed: ${response.statusText}`);
            }
            
            const results = await response.json();
            this.displayBacktestResults(results);
            
        } catch (error) {
            showNotification(`Backtest failed: ${error.message}`, 'error');
        }
    }

    /**
     * Display backtest results
     */
    displayBacktestResults(results) {
        const container = document.getElementById('backtest-results');
        
        container.innerHTML = `
            <div class="backtest-summary">
                <h3>Backtest Results</h3>
                <div class="metrics-grid">
                    <div class="metric">
                        <span class="label">Total Return:</span>
                        <span class="value ${results.totalReturn >= 0 ? 'positive' : 'negative'}">
                            ${(results.totalReturn * 100).toFixed(2)}%
                        </span>
                    </div>
                    <div class="metric">
                        <span class="label">Win Rate:</span>
                        <span class="value">${(results.winRate * 100).toFixed(2)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Sharpe Ratio:</span>
                        <span class="value">${results.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Max Drawdown:</span>
                        <span class="value negative">${(results.maxDrawdown * 100).toFixed(2)}%</span>
                    </div>
                    <div class="metric">
                        <span class="label">Total Trades:</span>
                        <span class="value">${results.totalTrades}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Profit Factor:</span>
                        <span class="value">${results.profitFactor.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Show chart
        this.plotBacktestChart(results.equity);
    }

    /**
     * Save script
     */
    async saveScript() {
        const name = prompt('Enter script name:');
        if (!name) return;
        
        const code = this.editor.getValue();
        
        try {
            const response = await fetch(`${Config.API_BASE_URL}/pinescript/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ name, code })
            });
            
            if (response.ok) {
                const script = await response.json();
                this.scripts.set(script.id, script);
                this.currentScript = script.id;
                showNotification(`Script saved: ${name}`, 'success');
                this.updateScriptsList();
            } else {
                throw new Error('Failed to save script');
            }
            
        } catch (error) {
            showNotification(`Failed to save: ${error.message}`, 'error');
        }
    }

    /**
     * Load scripts
     */
    async loadScripts() {
        try {
            const response = await fetch(`${Config.API_BASE_URL}/pinescript/scripts`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const scripts = await response.json();
                scripts.forEach(script => {
                    this.scripts.set(script.id, script);
                });
                this.updateScriptsList();
            }
            
        } catch (error) {
            console.error('Failed to load scripts:', error);
        }
    }

    /**
     * Load libraries
     */
    async loadLibraries() {
        // Built-in libraries
        this.libraries.set('ta', {
            name: 'Technical Analysis',
            functions: ['sma', 'ema', 'rsi', 'macd', 'bb', 'atr', 'stoch']
        });
        
        this.libraries.set('strategy', {
            name: 'Strategy',
            functions: ['entry', 'exit', 'close', 'cancel', 'risk']
        });
        
        this.libraries.set('math', {
            name: 'Mathematics',
            functions: ['abs', 'sign', 'max', 'min', 'sum', 'avg']
        });
        
        // Load custom libraries
        try {
            const response = await fetch(`${Config.API_BASE_URL}/pinescript/libraries`, {
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            });
            
            if (response.ok) {
                const libraries = await response.json();
                libraries.forEach(lib => {
                    this.libraries.set(lib.id, lib);
                });
            }
            
        } catch (error) {
            console.error('Failed to load libraries:', error);
        }
    }

    /**
     * Load snippets
     */
    loadSnippets() {
        if (!this.autocomplete) return;
        
        // Strategy template
        this.autocomplete.snippets.set('strategy', {
            description: 'Create a new strategy',
            code: `//@version=5
strategy("\${1:Strategy Name}", overlay=true, 
         initial_capital=10000, 
         default_qty_type=strategy.percent_of_equity, 
         default_qty_value=10)

// Parameters
\${2:// Add input parameters}

// Logic
\${3:// Add strategy logic}

// Entry conditions
longCondition = \${4:false}
shortCondition = \${5:false}

// Execute trades
if (longCondition)
    strategy.entry("Long", strategy.long)
    
if (shortCondition)
    strategy.entry("Short", strategy.short)`
        });
        
        // Indicator template
        this.autocomplete.snippets.set('indicator', {
            description: 'Create a new indicator',
            code: `//@version=5
indicator("\${1:Indicator Name}", overlay=\${2:true})

// Parameters
\${3:// Add input parameters}

// Calculations
\${4:// Add calculations}

// Plotting
\${5:// Add plots}`
        });
        
        // Moving average
        this.autocomplete.snippets.set('ma', {
            description: 'Moving average',
            code: `ma = ta.\${1|sma,ema,wma,vwma|}(close, \${2:20})
plot(ma, color=color.\${3:blue}, linewidth=2)`
        });
    }

    /**
     * Add keyboard shortcuts
     */
    addKeyboardShortcuts() {
        // Compile: Ctrl+Enter
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            this.compileScript();
        });
        
        // Save: Ctrl+S
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
            this.saveScript();
        });
        
        // Format: Shift+Alt+F
        this.editor.addCommand(
            monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KEY_F, 
            () => {
                this.editor.getAction('editor.action.formatDocument').run();
            }
        );
    }

    /**
     * Initialize UI
     */
    initializeUI() {
        // Compile button
        document.getElementById('compile-btn')?.addEventListener('click', () => {
            this.compileScript();
        });
        
        // Save button
        document.getElementById('save-script-btn')?.addEventListener('click', () => {
            this.saveScript();
        });
        
        // Backtest button
        document.getElementById('backtest-btn')?.addEventListener('click', () => {
            this.runBacktest();
        });
        
        // Scripts list
        document.getElementById('scripts-list')?.addEventListener('change', (e) => {
            const scriptId = e.target.value;
            if (scriptId && this.scripts.has(scriptId)) {
                const script = this.scripts.get(scriptId);
                this.editor.setValue(script.code);
                this.currentScript = scriptId;
            }
        });
        
        // Export button
        document.getElementById('export-script-btn')?.addEventListener('click', () => {
            this.exportScript();
        });
    }

    /**
     * Update scripts list
     */
    updateScriptsList() {
        const select = document.getElementById('scripts-list');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a script...</option>';
        
        this.scripts.forEach((script, id) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = script.name;
            if (id === this.currentScript) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    /**
     * Export script
     */
    exportScript() {
        const code = this.editor.getValue();
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `auraquant-script-${Date.now()}.pine`;
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification('Script exported', 'success');
    }
}

/**
 * Pine Script Autocomplete
 */
class PineScriptAutocomplete {
    constructor() {
        this.functions = new Map();
        this.variables = new Map();
        this.snippets = new Map();
    }

    loadFunctions() {
        // Technical analysis functions
        this.functions.set('ta.sma', {
            description: 'Simple Moving Average',
            snippet: 'ta.sma(${1:source}, ${2:length})'
        });
        
        this.functions.set('ta.ema', {
            description: 'Exponential Moving Average',
            snippet: 'ta.ema(${1:source}, ${2:length})'
        });
        
        this.functions.set('ta.rsi', {
            description: 'Relative Strength Index',
            snippet: 'ta.rsi(${1:source}, ${2:length})'
        });
        
        this.functions.set('ta.macd', {
            description: 'MACD',
            snippet: '[macdLine, signalLine, histLine] = ta.macd(${1:source}, ${2:fastlen}, ${3:slowlen}, ${4:siglen})'
        });
    }

    loadVariables() {
        this.variables.set('open', { description: 'Opening price' });
        this.variables.set('high', { description: 'High price' });
        this.variables.set('low', { description: 'Low price' });
        this.variables.set('close', { description: 'Closing price' });
        this.variables.set('volume', { description: 'Volume' });
        this.variables.set('time', { description: 'Bar time' });
        this.variables.set('bar_index', { description: 'Bar index' });
    }
}

/**
 * Pine Script Linter
 */
class PineScriptLinter {
    async check(code) {
        const errors = [];
        
        // Basic syntax checks
        const lines = code.split('\n');
        
        lines.forEach((line, index) => {
            // Check for version
            if (index === 0 && !line.includes('@version=')) {
                errors.push({
                    line: 1,
                    column: 1,
                    length: line.length,
                    message: 'Missing @version directive',
                    severity: 'error'
                });
            }
            
            // Check for unclosed brackets
            const openBrackets = (line.match(/\(/g) || []).length;
            const closeBrackets = (line.match(/\)/g) || []).length;
            if (openBrackets !== closeBrackets) {
                errors.push({
                    line: index + 1,
                    column: 1,
                    length: line.length,
                    message: 'Unmatched brackets',
                    severity: 'error'
                });
            }
        });
        
        return errors;
    }
}

// Export
export default PineScriptEditor;