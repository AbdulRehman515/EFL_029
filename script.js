// Main JavaScript for the EFL Investment Platform

class InvestmentCalculator {
    constructor() {
        this.plans = {
            basic: {
                name: 'Basic Savings Plan',
                minMonthly: 50,
                maxAnnual: 20000,
                minInitial: 0,
                returns: { min: 0.012, max: 0.024 },
                monthlyFee: 0.0025,
                taxBrackets: [{ threshold: Infinity, rate: 0 }]
            },
            plus: {
                name: 'Savings Plan Plus',
                minMonthly: 50,
                maxAnnual: 30000,
                minInitial: 300,
                returns: { min: 0.03, max: 0.055 },
                monthlyFee: 0.003,
                taxBrackets: [{ threshold: 12000, rate: 0.10 }]
            },
            managed: {
                name: 'Managed Stock Investments',
                minMonthly: 150,
                maxAnnual: Infinity,
                minInitial: 1000,
                returns: { min: 0.04, max: 0.23 },
                monthlyFee: 0.013,
                taxBrackets: [
                    { threshold: 12000, rate: 0.10 },
                    { threshold: 40000, rate: 0.20 }
                ]
            }
        };
    }

    // Calculate investment returns for a specific period
    calculateReturns(initial, monthly, plan, years) {
        const planData = this.plans[plan];
        if (!planData) return null;

        // Validate inputs
        if (initial < planData.minInitial) {
            throw new Error(`Minimum initial investment for ${planData.name} is £${planData.minInitial}`);
        }
        
        if (monthly < planData.minMonthly) {
            throw new Error(`Minimum monthly investment for ${planData.name} is £${planData.minMonthly}`);
        }
        
        const annualTotal = initial + (monthly * 12);
        if (annualTotal > planData.maxAnnual) {
            throw new Error(`Maximum annual investment for ${planData.name} is £${planData.maxAnnual.toLocaleString()}`);
        }

        // Calculate compound interest with monthly contributions
        let minValue = initial;
        let maxValue = initial;
        let totalFees = 0;
        
        for (let year = 1; year <= years; year++) {
            for (let month = 1; month <= 12; month++) {
                // Add monthly contribution at start of month
                minValue += monthly;
                maxValue += monthly;
                
                // Calculate monthly growth
                const monthlyMinRate = Math.pow(1 + planData.returns.min, 1/12) - 1;
                const monthlyMaxRate = Math.pow(1 + planData.returns.max, 1/12) - 1;
                
                minValue *= (1 + monthlyMinRate);
                maxValue *= (1 + monthlyMaxRate);
                
                // Calculate and subtract monthly fee
                const monthlyFee = (minValue + maxValue) / 2 * planData.monthlyFee;
                totalFees += monthlyFee;
                minValue -= monthlyFee / 2;
                maxValue -= monthlyFee / 2;
            }
        }

        // Calculate tax
        const minProfit = minValue - initial - (monthly * 12 * years);
        const maxProfit = maxValue - initial - (monthly * 12 * years);
        
        const minTax = this.calculateTax(minProfit, planData.taxBrackets);
        const maxTax = this.calculateTax(maxProfit, planData.taxBrackets);

        return {
            minValue: Math.max(0, minValue - minTax),
            maxValue: Math.max(0, maxValue - maxTax),
            totalFees,
            minTax,
            maxTax,
            minProfit: Math.max(0, minProfit - minTax),
            maxProfit: Math.max(0, maxProfit - maxTax)
        };
    }

    // Calculate tax based on brackets
    calculateTax(profit, brackets) {
        if (profit <= 0) return 0;
        
        let tax = 0;
        let remainingProfit = profit;
        let previousThreshold = 0;
        
        for (const bracket of brackets) {
            if (profit > previousThreshold) {
                const taxableAmount = Math.min(profit, bracket.threshold) - previousThreshold;
                tax += taxableAmount * bracket.rate;
                previousThreshold = bracket.threshold;
            }
        }
        
        return tax;
    }

    // Generate recommendation based on user inputs
    generateRecommendation(initial, monthly, riskTolerance = 'medium') {
        const recommendations = [];
        
        for (const [planKey, planData] of Object.entries(this.plans)) {
            try {
                const returns1yr = this.calculateReturns(initial, monthly, planKey, 1);
                const returns5yr = this.calculateReturns(initial, monthly, planKey, 5);
                const returns10yr = this.calculateReturns(initial, monthly, planKey, 10);
                
                recommendations.push({
                    plan: planKey,
                    name: planData.name,
                    avgReturn: (planData.returns.min + planData.returns.max) / 2,
                    returns1yr,
                    returns5yr,
                    returns10yr,
                    risk: this.getRiskLevel(planKey)
                });
            } catch (error) {
                // Plan not suitable for these inputs
                continue;
            }
        }
        
        // Sort by average return
        recommendations.sort((a, b) => b.avgReturn - a.avgReturn);
        
        // Filter by risk tolerance if specified
        const riskMap = { low: 0, medium: 1, high: 2 };
        const userRisk = riskMap[riskTolerance];
        
        const filtered = recommendations.filter(rec => {
            const planRisk = riskMap[this.getRiskLevel(rec.plan)];
            return planRisk <= userRisk;
        });
        
        return filtered.length > 0 ? filtered[0] : recommendations[0];
    }

    getRiskLevel(plan) {
        switch(plan) {
            case 'basic': return 'low';
            case 'plus': return 'medium';
            case 'managed': return 'high';
            default: return 'medium';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const calculator = new InvestmentCalculator();
    
    // Initialize tooltips
    initTooltips();
    
    // Initialize form validations
    initFormValidations();
    
    // Initialize investment plan selection
    initInvestmentPlans(calculator);
    
    // Initialize quote generation
    initQuoteGeneration(calculator);
    
    // Initialize profile forms
    initProfileForms();
    
    // Initialize error logging
    initErrorLogging();
});

// Initialize tooltips
function initTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.dataset.tooltip;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.position = 'absolute';
            tooltip.style.left = `${rect.left + rect.width/2}px`;
            tooltip.style.top = `${rect.top - 10}px`;
            tooltip.style.transform = 'translate(-50%, -100%)';
            
            this._tooltip = tooltip;
        });
        
        element.addEventListener('mouseleave', function() {
            if (this._tooltip) {
                this._tooltip.remove();
                delete this._tooltip;
            }
        });
    });
}

// Initialize form validations
function initFormValidations() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate required fields
            const requiredFields = this.querySelectorAll('[required]');
            let isValid = true;
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.style.borderColor = 'var(--danger-color)';
                    
                    // Add error message
                    let errorMsg = field.nextElementSibling;
                    if (!errorMsg || !errorMsg.classList.contains('error-message')) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        errorMsg.style.color = 'var(--danger-color)';
                        errorMsg.style.fontSize = '0.85rem';
                        errorMsg.style.marginTop = '0.25rem';
                        field.parentNode.appendChild(errorMsg);
                    }
                    errorMsg.textContent = 'This field is required';
                } else {
                    field.style.borderColor = '';
                    const errorMsg = field.nextElementSibling;
                    if (errorMsg && errorMsg.classList.contains('error-message')) {
                        errorMsg.remove();
                    }
                }
            });
            
            if (isValid) {
                // Form is valid, show success
                window.shared.showToast('Form submitted successfully!');
                
                // For demo purposes, simulate API call
                setTimeout(() => {
                    if (form.id === 'personalForm') {
                        savePersonalInfo();
                    } else if (form.id === 'securityForm') {
                        updatePassword();
                    }
                }, 1000);
            }
        });
    });
}

// Initialize investment plan selection
function initInvestmentPlans(calculator) {
    const planButtons = document.querySelectorAll('.select-plan');
    const recommendationContent = document.getElementById('recommendationContent');
    const generateQuoteBtn = document.getElementById('generateQuote');
    
    if (planButtons.length > 0) {
        planButtons.forEach(button => {
            button.addEventListener('click', function() {
                const plan = this.dataset.plan;
                
                // Update selected state
                planButtons.forEach(btn => {
                    btn.classList.remove('btn-primary');
                    btn.classList.add('btn-outline');
                });
                this.classList.remove('btn-outline');
                this.classList.add('btn-primary');
                
                // Update recommendation
                if (recommendationContent) {
                    const planData = calculator.plans[plan];
                    const recommendation = calculator.generateRecommendation(1000, 200, 'medium');
                    
                    let recommendationHTML = `
                        <h4>${planData.name} - ${calculator.getRiskLevel(plan).toUpperCase()} RISK</h4>
                        <p>Based on your profile, we recommend this plan because:</p>
                        <ul>
                            <li><strong>Expected Returns:</strong> ${(planData.returns.min*100).toFixed(1)}% - ${(planData.returns.max*100).toFixed(1)}% annually</li>
                            <li><strong>Minimum Investment:</strong> £${planData.minInitial} initial + £${planData.minMonthly}/month</li>
                            <li><strong>Fees:</strong> ${(planData.monthlyFee*100).toFixed(2)}% monthly management fee</li>
                    `;
                    
                    if (plan === 'basic') {
                        recommendationHTML += `<li><strong>Tax Efficiency:</strong> 0% tax on all profits</li>`;
                    } else if (plan === 'plus') {
                        recommendationHTML += `<li><strong>Tax:</strong> 10% on profits above £12,000</li>`;
                    } else {
                        recommendationHTML += `<li><strong>Tax:</strong> 10% on profits above £12,000 + 20% above £40,000</li>`;
                    }
                    
                    recommendationHTML += `
                        </ul>
                        <p><strong>Best for:</strong> ${plan === 'basic' ? 'Conservative investors' : plan === 'plus' ? 'Balanced growth seekers' : 'Aggressive investors seeking high returns'}</p>
                    `;
                    
                    recommendationContent.innerHTML = recommendationHTML;
                }
                
                // Store selected plan for quote generation
                localStorage.setItem('selectedPlan', plan);
                window.shared.showToast(`${calculator.plans[plan].name} selected`);
            });
        });
        
        // Select first plan by default
        if (planButtons.length > 0) {
            planButtons[1].click(); // Select Savings Plan Plus by default
        }
    }
    
    // Generate quote button
    if (generateQuoteBtn) {
        generateQuoteBtn.addEventListener('click', function() {
            const selectedPlan = localStorage.getItem('selectedPlan');
            if (!selectedPlan) {
                window.shared.showError('Please select an investment plan first');
                return;
            }
            
            // Redirect to quotes page
            window.location.href = 'quotes.html';
        });
    }
}

// Initialize quote generation
function initQuoteGeneration(calculator) {
    const calculateQuoteBtn = document.getElementById('calculateQuote');
    const saveQuoteBtn = document.getElementById('saveQuote');
    const downloadQuoteBtn = document.getElementById('downloadQuote');
    
    if (calculateQuoteBtn) {
        calculateQuoteBtn.addEventListener('click', function() {
            const initial = parseFloat(document.getElementById('initialInvestment').value) || 0;
            const monthly = parseFloat(document.getElementById('monthlyInvestment').value) || 0;
            const plan = document.getElementById('selectedPlan').value;
            
            if (!plan) {
                window.shared.showError('Please select an investment plan');
                return;
            }
            
            try {
                // Calculate returns for different time periods
                const returns1yr = calculator.calculateReturns(initial, monthly, plan, 1);
                const returns5yr = calculator.calculateReturns(initial, monthly, plan, 5);
                const returns10yr = calculator.calculateReturns(initial, monthly, plan, 10);
                
                // Update display
                document.getElementById('quotePlanName').textContent = calculator.plans[plan].name;
                document.getElementById('quoteDate').textContent = new Date().toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
                document.getElementById('quoteInitial').textContent = window.shared.formatCurrency(initial);
                document.getElementById('quoteMonthly').textContent = window.shared.formatCurrency(monthly);
                document.getElementById('quotePlan').textContent = calculator.plans[plan].name;
                
                // Update 1 year projection
                document.getElementById('year1Min').textContent = window.shared.formatCurrency(returns1yr.minValue);
                document.getElementById('year1Max').textContent = window.shared.formatCurrency(returns1yr.maxValue);
                document.getElementById('year1Fees').textContent = window.shared.formatCurrency(returns1yr.totalFees);
                document.getElementById('year1Tax').textContent = window.shared.formatCurrency(returns1yr.minTax);
                document.getElementById('year1Profit').textContent = window.shared.formatCurrency(returns1yr.minProfit);
                
                // Update 5 year projection
                document.getElementById('year5Min').textContent = window.shared.formatCurrency(returns5yr.minValue);
                document.getElementById('year5Max').textContent = window.shared.formatCurrency(returns5yr.maxValue);
                document.getElementById('year5Fees').textContent = window.shared.formatCurrency(returns5yr.totalFees);
                document.getElementById('year5Tax').textContent = window.shared.formatCurrency(returns5yr.minTax);
                document.getElementById('year5Profit').textContent = window.shared.formatCurrency(returns5yr.minProfit);
                
                // Update 10 year projection
                document.getElementById('year10Min').textContent = window.shared.formatCurrency(returns10yr.minValue);
                document.getElementById('year10Max').textContent = window.shared.formatCurrency(returns10yr.maxValue);
                document.getElementById('year10Fees').textContent = window.shared.formatCurrency(returns10yr.totalFees);
                document.getElementById('year10Tax').textContent = window.shared.formatCurrency(returns10yr.minTax);
                document.getElementById('year10Profit').textContent = window.shared.formatCurrency(returns10yr.minProfit);
                
                // Store current quote for saving
                window.currentQuote = {
                    initial,
                    monthly,
                    plan,
                    returns1yr,
                    returns5yr,
                    returns10yr,
                    timestamp: new Date().toISOString()
                };
                
                window.shared.showToast('Quote calculated successfully!');
            } catch (error) {
                window.shared.showError(error.message);
            }
        });
    }
    
    // Save quote
    if (saveQuoteBtn) {
        saveQuoteBtn.addEventListener('click', function() {
            if (!window.currentQuote) {
                window.shared.showError('Please calculate a quote first');
                return;
            }
            
            const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
            savedQuotes.unshift({
                ...window.currentQuote,
                id: Date.now()
            });
            
            localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes.slice(0, 20))); // Keep last 20
            
            updateSavedQuotesDisplay();
            window.shared.showToast('Quote saved successfully!');
        });
    }
    
    // Download quote as PDF (simulated)
    if (downloadQuoteBtn) {
        downloadQuoteBtn.addEventListener('click', function() {
            if (!window.currentQuote) {
                window.shared.showError('Please calculate a quote first');
                return;
            }
            
            // Simulate PDF download
            const quoteText = `EFL Investment Quote\n\n` +
                `Plan: ${calculator.plans[window.currentQuote.plan].name}\n` +
                `Initial Investment: ${window.shared.formatCurrency(window.currentQuote.initial)}\n` +
                `Monthly Investment: ${window.shared.formatCurrency(window.currentQuote.monthly)}\n\n` +
                `1 Year Projection:\n` +
                `  Min Value: ${window.shared.formatCurrency(window.currentQuote.returns1yr.minValue)}\n` +
                `  Max Value: ${window.shared.formatCurrency(window.currentQuote.returns1yr.maxValue)}\n` +
                `  Total Fees: ${window.shared.formatCurrency(window.currentQuote.returns1yr.totalFees)}\n` +
                `  Total Tax: ${window.shared.formatCurrency(window.currentQuote.returns1yr.minTax)}\n` +
                `  Total Profit: ${window.shared.formatCurrency(window.currentQuote.returns1yr.minProfit)}\n\n` +
                `Generated: ${new Date().toLocaleDateString()}`;
            
            const blob = new Blob([quoteText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `EFL-Quote-${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.shared.showToast('Quote downloaded successfully!');
        });
    }
    
    // Update saved quotes display
    function updateSavedQuotesDisplay() {
        const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
        const savedQuotesList = document.getElementById('savedQuotesList');
        
        if (!savedQuotesList) return;
        
        if (savedQuotes.length === 0) {
            savedQuotesList.innerHTML = '<p class="empty-message">No saved quotes yet. Generate a quote and save it to view here.</p>';
            return;
        }
        
        savedQuotesList.innerHTML = savedQuotes.map(quote => {
            const date = new Date(quote.timestamp);
            const formattedDate = date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="quote-item">
                    <div class="quote-item-header">
                        <h4>${calculator.plans[quote.plan].name}</h4>
                        <span class="quote-date">${formattedDate}</span>
                    </div>
                    <div class="quote-item-details">
                        <div>Initial: ${window.shared.formatCurrency(quote.initial)}</div>
                        <div>Monthly: ${window.shared.formatCurrency(quote.monthly)}</div>
                        <div>1yr Profit: ${window.shared.formatCurrency(quote.returns1yr.minProfit)}</div>
                    </div>
                    <button class="btn btn-outline btn-small load-quote" data-id="${quote.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            `;
        }).join('');
        
        // Add event listeners to load buttons
        document.querySelectorAll('.load-quote').forEach(button => {
            button.addEventListener('click', function() {
                const quoteId = parseInt(this.dataset.id);
                const savedQuotes = JSON.parse(localStorage.getItem('savedQuotes') || '[]');
                const quote = savedQuotes.find(q => q.id === quoteId);
                
                if (quote) {
                    // Fill the quote form with saved values
                    document.getElementById('initialInvestment').value = quote.initial;
                    document.getElementById('monthlyInvestment').value = quote.monthly;
                    document.getElementById('selectedPlan').value = quote.plan;
                    
                    // Trigger calculation
                    document.getElementById('calculateQuote').click();
                    window.shared.showToast('Quote loaded successfully!');
                }
            });
        });
    }
    
    // Initialize saved quotes display
    updateSavedQuotesDisplay();
}

// Initialize profile forms
function initProfileForms() {
    // Personal info form
    const personalForm = document.getElementById('personalForm');
    if (personalForm) {
        personalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const userData = window.shared.loadUserData();
            userData.firstName = document.getElementById('firstName').value;
            userData.lastName = document.getElementById('lastName').value;
            userData.email = document.getElementById('email').value;
            userData.phone = document.getElementById('phone').value;
            userData.address = document.getElementById('address').value;
            
            // Validate email
            if (!window.shared.validateEmail(userData.email)) {
                window.shared.showError('Please enter a valid email address');
                return;
            }
            
            window.shared.saveUserData(userData);
        });
    }
    
    // Security form
    const securityForm = document.getElementById('securityForm');
    if (securityForm) {
        securityForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validate current password (in real app, would check against stored hash)
            if (!currentPassword) {
                window.shared.showError('Please enter your current password');
                return;
            }
            
            // Validate new password
            const passwordValidation = window.shared.validatePassword(newPassword);
            if (!passwordValidation.isValid) {
                window.shared.showError('New password does not meet requirements');
                return;
            }
            
            // Check if passwords match
            if (newPassword !== confirmPassword) {
                window.shared.showError('New passwords do not match');
                return;
            }
            
            // In a real app, you would send this to your backend
            // For demo, just show success
            window.shared.showToast('Password updated successfully!');
            
            // Clear form
            securityForm.reset();
        });
    }
    
    // Preferences form
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const userData = window.shared.loadUserData();
            userData.preferences.defaultCurrency = document.getElementById('defaultCurrency').value;
            userData.preferences.language = document.getElementById('language').value;
            userData.preferences.emailNotifications = document.getElementById('emailNotifications').checked;
            userData.preferences.smsNotifications = document.getElementById('smsNotifications').checked;
            userData.preferences.marketingEmails = document.getElementById('marketingEmails').checked;
            
            window.shared.saveUserData(userData);
        });
    }
    
    // Profile tabs
    const tabButtons = document.querySelectorAll('.profile-menu-item');
    const tabs = document.querySelectorAll('.profile-tab');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected tab
            tabs.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === `${tabId}Tab`) {
                    tab.classList.add('active');
                }
            });
        });
    });
    
    // Two-factor authentication
    const enable2FA = document.getElementById('enable2FA');
    if (enable2FA) {
        enable2FA.addEventListener('click', function() {
            // Simulate 2FA setup
            const modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-mobile-alt"></i> Two-Factor Authentication</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Scan this QR code with your authenticator app:</p>
                        <div style="text-align: center; margin: 2rem 0;">
                            <div style="width: 200px; height: 200px; background: #f0f0f0; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-qrcode" style="font-size: 100px; color: #666;"></i>
                            </div>
                        </div>
                        <p>Or enter this code manually: <code>ABCD-EFGH-IJKL-MNOP</code></p>
                        <div class="form-group" style="margin-top: 2rem;">
                            <label for="2faCode">Enter verification code</label>
                            <input type="text" id="2faCode" placeholder="000000" maxlength="6">
                        </div>
                        <button class="btn btn-primary btn-block" id="verify2FA">
                            <i class="fas fa-check"></i> Verify and Enable
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Close modal
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.remove();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // Verify 2FA
            modal.querySelector('#verify2FA').addEventListener('click', () => {
                const code = modal.querySelector('#2faCode').value;
                if (code === '123456') { // Demo code
                    modal.remove();
                    window.shared.showToast('Two-factor authentication enabled successfully!');
                    enable2FA.innerHTML = '<i class="fas fa-check-circle"></i> 2FA Enabled';
                    enable2FA.disabled = true;
                } else {
                    window.shared.showError('Invalid verification code. Please try again.');
                }
            });
        });
    }
}

// Initialize error logging
function initErrorLogging() {
    // Check for system errors in localStorage
    const errors = JSON.parse(localStorage.getItem('systemErrors') || '[]');
    const errorLog = document.getElementById('errorLog');
    
    if (errorLog && errors.length > 0) {
        const errorLogContent = errorLog.querySelector('.error-log-content');
        errorLogContent.innerHTML = errors.map(error => `
            <div class="error-log-item">
                <div class="error-time">${new Date(error.timestamp).toLocaleString()}</div>
                <div class="error-message">${error.message}</div>
                <div class="error-url">${error.url}</div>
            </div>
        `).join('');
        
        errorLog.style.display = 'block';
    }
    
    // Simulate occasional errors for demonstration
    if (Math.random() < 0.1) { // 10% chance
        setTimeout(() => {
            console.error('Simulated system error for demonstration');
            const errors = JSON.parse(localStorage.getItem('systemErrors') || '[]');
            errors.push({
                message: 'Database connection timeout',
                timestamp: new Date().toISOString(),
                url: window.location.href
            });
            localStorage.setItem('systemErrors', JSON.stringify(errors.slice(-10)));
        }, 5000);
    }
}

// Export for use in other files
window.InvestmentCalculator = InvestmentCalculator;