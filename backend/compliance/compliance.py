"""
AuraQuant Compliance System
Handles regulatory compliance, trade validation, audit trails, and reporting
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from enum import Enum
import hashlib
import hmac
from dataclasses import dataclass, asdict
import re
import pandas as pd
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

class ComplianceLevel(Enum):
    """Compliance check severity levels"""
    INFO = "info"
    WARNING = "warning"
    VIOLATION = "violation"
    CRITICAL = "critical"

class RegulatoryRegion(Enum):
    """Regulatory jurisdictions"""
    AUSTRALIA = "AU"
    USA = "US"
    EUROPE = "EU"
    UK = "UK"
    SINGAPORE = "SG"
    HONG_KONG = "HK"
    JAPAN = "JP"
    GLOBAL = "GLOBAL"

@dataclass
class ComplianceRule:
    """Compliance rule definition"""
    id: str
    name: str
    description: str
    region: RegulatoryRegion
    category: str
    check_function: str
    severity: ComplianceLevel
    enabled: bool = True
    parameters: Dict = None

@dataclass
class ComplianceViolation:
    """Compliance violation record"""
    rule_id: str
    rule_name: str
    severity: ComplianceLevel
    description: str
    timestamp: datetime
    user_id: str
    trade_id: Optional[str] = None
    details: Dict = None
    resolved: bool = False
    resolution_notes: Optional[str] = None

class ComplianceManager:
    """Main compliance management system"""
    
    def __init__(self, db_session: AsyncSession = None):
        self.db = db_session
        self.rules = {}
        self.violations = []
        self.audit_trail = []
        self.suspicious_patterns = {}
        self.watchlists = {}
        self.reporting_queue = asyncio.Queue()
        
        # Initialize compliance rules
        self.initialize_rules()
        
        # Start monitoring
        self.monitoring_task = None
        
    def initialize_rules(self):
        """Initialize all compliance rules"""
        
        # Australian ASIC rules
        self.add_rule(ComplianceRule(
            id="ASIC_001",
            name="Best Execution",
            description="Ensure best execution for client orders",
            region=RegulatoryRegion.AUSTRALIA,
            category="Trading",
            check_function="check_best_execution",
            severity=ComplianceLevel.WARNING,
            parameters={"slippage_threshold": 0.005}
        ))
        
        self.add_rule(ComplianceRule(
            id="ASIC_002",
            name="Market Manipulation Check",
            description="Detect potential market manipulation patterns",
            region=RegulatoryRegion.AUSTRALIA,
            category="Market Conduct",
            check_function="check_market_manipulation",
            severity=ComplianceLevel.CRITICAL,
            parameters={"volume_spike": 5, "price_impact": 0.02}
        ))
        
        # US SEC/FINRA rules
        self.add_rule(ComplianceRule(
            id="SEC_001",
            name="Pattern Day Trading",
            description="Monitor PDT rule compliance (25k minimum)",
            region=RegulatoryRegion.USA,
            category="Trading",
            check_function="check_pdt_rule",
            severity=ComplianceLevel.VIOLATION,
            parameters={"minimum_equity": 25000, "day_trade_limit": 3}
        ))
        
        self.add_rule(ComplianceRule(
            id="SEC_002",
            name="Wash Sale Rule",
            description="Prevent wash sale violations",
            region=RegulatoryRegion.USA,
            category="Tax",
            check_function="check_wash_sale",
            severity=ComplianceLevel.WARNING,
            parameters={"days_window": 30}
        ))
        
        # EU MiFID II rules
        self.add_rule(ComplianceRule(
            id="MIFID_001",
            name="Transaction Reporting",
            description="Ensure timely transaction reporting",
            region=RegulatoryRegion.EUROPE,
            category="Reporting",
            check_function="check_transaction_reporting",
            severity=ComplianceLevel.VIOLATION,
            parameters={"reporting_deadline": "T+1"}
        ))
        
        # Global AML rules
        self.add_rule(ComplianceRule(
            id="AML_001",
            name="Suspicious Activity Detection",
            description="Detect suspicious trading patterns",
            region=RegulatoryRegion.GLOBAL,
            category="AML",
            check_function="check_suspicious_activity",
            severity=ComplianceLevel.CRITICAL,
            parameters={
                "rapid_trades": 50,
                "volume_threshold": 100000,
                "unusual_hours": True
            }
        ))
        
        self.add_rule(ComplianceRule(
            id="AML_002",
            name="Layering Detection",
            description="Detect potential layering schemes",
            region=RegulatoryRegion.GLOBAL,
            category="AML",
            check_function="check_layering",
            severity=ComplianceLevel.CRITICAL
        ))
        
        # Risk management rules
        self.add_rule(ComplianceRule(
            id="RISK_001",
            name="Position Concentration",
            description="Monitor position concentration limits",
            region=RegulatoryRegion.GLOBAL,
            category="Risk",
            check_function="check_position_concentration",
            severity=ComplianceLevel.WARNING,
            parameters={"max_concentration": 0.20}
        ))
        
        self.add_rule(ComplianceRule(
            id="RISK_002",
            name="Leverage Limits",
            description="Enforce leverage restrictions",
            region=RegulatoryRegion.GLOBAL,
            category="Risk",
            check_function="check_leverage_limits",
            severity=ComplianceLevel.VIOLATION,
            parameters={"max_leverage": 10}
        ))
        
    def add_rule(self, rule: ComplianceRule):
        """Add a compliance rule"""
        self.rules[rule.id] = rule
        logger.info(f"Added compliance rule: {rule.name}")
        
    async def check_trade_compliance(
        self,
        user_id: str,
        trade: Dict,
        region: RegulatoryRegion = RegulatoryRegion.GLOBAL
    ) -> Tuple[bool, List[ComplianceViolation]]:
        """Check if a trade meets compliance requirements"""
        
        violations = []
        
        # Get applicable rules
        applicable_rules = [
            rule for rule in self.rules.values()
            if rule.enabled and (rule.region == region or rule.region == RegulatoryRegion.GLOBAL)
        ]
        
        # Run compliance checks
        for rule in applicable_rules:
            try:
                check_method = getattr(self, rule.check_function, None)
                if check_method:
                    result = await check_method(user_id, trade, rule.parameters or {})
                    
                    if not result["compliant"]:
                        violation = ComplianceViolation(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            severity=rule.severity,
                            description=result.get("message", "Compliance check failed"),
                            timestamp=datetime.utcnow(),
                            user_id=user_id,
                            trade_id=trade.get("id"),
                            details=result.get("details", {})
                        )
                        violations.append(violation)
                        
            except Exception as e:
                logger.error(f"Error checking rule {rule.id}: {e}")
                
        # Record violations
        if violations:
            await self.record_violations(violations)
            
        # Determine if trade can proceed
        critical_violations = [v for v in violations if v.severity == ComplianceLevel.CRITICAL]
        can_proceed = len(critical_violations) == 0
        
        return can_proceed, violations
        
    async def check_best_execution(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Check best execution compliance"""
        
        slippage = abs(trade.get("executed_price", 0) - trade.get("expected_price", 0))
        slippage_pct = slippage / trade.get("expected_price", 1) if trade.get("expected_price") else 0
        
        if slippage_pct > params.get("slippage_threshold", 0.005):
            return {
                "compliant": False,
                "message": f"Excessive slippage: {slippage_pct:.2%}",
                "details": {"slippage": slippage_pct}
            }
            
        return {"compliant": True}
        
    async def check_market_manipulation(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Check for market manipulation patterns"""
        
        # Check for spoofing patterns
        recent_orders = await self.get_recent_orders(user_id, minutes=5)
        cancelled_ratio = len([o for o in recent_orders if o["status"] == "cancelled"]) / max(len(recent_orders), 1)
        
        if cancelled_ratio > 0.8:
            return {
                "compliant": False,
                "message": "Potential spoofing detected - high order cancellation rate",
                "details": {"cancelled_ratio": cancelled_ratio}
            }
            
        # Check for pump and dump
        volume_spike = trade.get("volume", 0) / trade.get("avg_volume", 1) if trade.get("avg_volume") else 0
        price_impact = abs(trade.get("price_change", 0))
        
        if volume_spike > params.get("volume_spike", 5) and price_impact > params.get("price_impact", 0.02):
            return {
                "compliant": False,
                "message": "Unusual volume and price movement detected",
                "details": {
                    "volume_spike": volume_spike,
                    "price_impact": price_impact
                }
            }
            
        return {"compliant": True}
        
    async def check_pdt_rule(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Check Pattern Day Trading rule compliance (US)"""
        
        # Get account equity
        account = await self.get_account_info(user_id)
        equity = account.get("equity", 0)
        
        # Count day trades in last 5 business days
        day_trades = await self.count_day_trades(user_id, days=5)
        
        if equity < params.get("minimum_equity", 25000) and day_trades >= params.get("day_trade_limit", 3):
            return {
                "compliant": False,
                "message": f"PDT rule violation - equity ${equity:,.2f} below $25,000 minimum",
                "details": {
                    "equity": equity,
                    "day_trades": day_trades
                }
            }
            
        return {"compliant": True}
        
    async def check_wash_sale(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Check for wash sale violations"""
        
        if trade.get("action") != "sell":
            return {"compliant": True}
            
        symbol = trade.get("symbol")
        days_window = params.get("days_window", 30)
        
        # Check for repurchase within window
        repurchases = await self.get_trades(
            user_id,
            symbol=symbol,
            action="buy",
            days=days_window
        )
        
        if repurchases and trade.get("realized_loss", 0) > 0:
            return {
                "compliant": False,
                "message": f"Potential wash sale - repurchased {symbol} within {days_window} days of loss",
                "details": {
                    "symbol": symbol,
                    "loss": trade.get("realized_loss"),
                    "repurchase_count": len(repurchases)
                }
            }
            
        return {"compliant": True}
        
    async def check_suspicious_activity(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Check for suspicious trading activity (AML)"""
        
        # Check rapid trading
        recent_trades = await self.get_recent_trades(user_id, minutes=60)
        if len(recent_trades) > params.get("rapid_trades", 50):
            return {
                "compliant": False,
                "message": "Suspicious activity - excessive trading frequency",
                "details": {"trade_count": len(recent_trades)}
            }
            
        # Check large volumes
        if trade.get("value", 0) > params.get("volume_threshold", 100000):
            # Flag for review but don't block
            await self.flag_for_review(user_id, trade, "Large transaction")
            
        # Check unusual hours
        if params.get("unusual_hours") and self.is_unusual_hour(trade.get("timestamp")):
            await self.flag_for_review(user_id, trade, "Trading at unusual hours")
            
        return {"compliant": True}
        
    async def check_layering(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Detect potential layering schemes"""
        
        # Get order book activity
        orders = await self.get_recent_orders(user_id, minutes=10)
        
        # Check for multiple orders at different price levels
        price_levels = {}
        for order in orders:
            price = order.get("price")
            if price:
                price_levels[price] = price_levels.get(price, 0) + 1
                
        # Detect layering pattern
        if len(price_levels) > 5:
            # Multiple price levels with orders
            avg_per_level = sum(price_levels.values()) / len(price_levels)
            if avg_per_level > 2:
                return {
                    "compliant": False,
                    "message": "Potential layering detected - multiple orders at different price levels",
                    "details": {
                        "price_levels": len(price_levels),
                        "total_orders": len(orders)
                    }
                }
                
        return {"compliant": True}
        
    async def check_position_concentration(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Check position concentration limits"""
        
        portfolio = await self.get_portfolio(user_id)
        total_value = sum(pos.get("value", 0) for pos in portfolio)
        
        symbol = trade.get("symbol")
        position_value = trade.get("value", 0)
        
        # Add to existing position
        for pos in portfolio:
            if pos.get("symbol") == symbol:
                position_value += pos.get("value", 0)
                
        concentration = position_value / total_value if total_value > 0 else 0
        
        if concentration > params.get("max_concentration", 0.20):
            return {
                "compliant": False,
                "message": f"Position concentration too high: {concentration:.1%}",
                "details": {
                    "symbol": symbol,
                    "concentration": concentration
                }
            }
            
        return {"compliant": True}
        
    async def check_leverage_limits(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Check leverage restrictions"""
        
        account = await self.get_account_info(user_id)
        leverage = account.get("leverage", 1)
        
        if leverage > params.get("max_leverage", 10):
            return {
                "compliant": False,
                "message": f"Leverage {leverage}x exceeds maximum {params.get('max_leverage')}x",
                "details": {"current_leverage": leverage}
            }
            
        return {"compliant": True}
        
    async def check_transaction_reporting(self, user_id: str, trade: Dict, params: Dict) -> Dict:
        """Check transaction reporting compliance"""
        
        # Check if trade has been reported
        reported = await self.is_trade_reported(trade.get("id"))
        
        if not reported:
            # Schedule for reporting
            await self.schedule_reporting(trade)
            
        return {"compliant": True}
        
    async def record_violations(self, violations: List[ComplianceViolation]):
        """Record compliance violations"""
        
        for violation in violations:
            self.violations.append(violation)
            
            # Log violation
            logger.warning(f"Compliance violation: {violation.rule_name} - {violation.description}")
            
            # Store in database
            if self.db:
                await self.store_violation(violation)
                
            # Send alerts for critical violations
            if violation.severity == ComplianceLevel.CRITICAL:
                await self.send_critical_alert(violation)
                
    async def generate_compliance_report(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        region: Optional[RegulatoryRegion] = None
    ) -> Dict:
        """Generate compliance report"""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
            
        # Filter violations
        filtered_violations = [
            v for v in self.violations
            if (not user_id or v.user_id == user_id)
            and start_date <= v.timestamp <= end_date
        ]
        
        # Group by severity
        by_severity = {}
        for violation in filtered_violations:
            severity = violation.severity.value
            if severity not in by_severity:
                by_severity[severity] = []
            by_severity[severity].append(violation)
            
        # Generate summary
        report = {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_violations": len(filtered_violations),
                "critical": len(by_severity.get(ComplianceLevel.CRITICAL.value, [])),
                "violations": len(by_severity.get(ComplianceLevel.VIOLATION.value, [])),
                "warnings": len(by_severity.get(ComplianceLevel.WARNING.value, [])),
                "info": len(by_severity.get(ComplianceLevel.INFO.value, []))
            },
            "violations": [asdict(v) for v in filtered_violations],
            "recommendations": self.generate_recommendations(filtered_violations),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return report
        
    def generate_recommendations(self, violations: List[ComplianceViolation]) -> List[str]:
        """Generate compliance recommendations based on violations"""
        
        recommendations = []
        
        # Analyze violation patterns
        rule_counts = {}
        for violation in violations:
            rule_counts[violation.rule_id] = rule_counts.get(violation.rule_id, 0) + 1
            
        # Generate recommendations
        for rule_id, count in rule_counts.items():
            if count > 5:
                rule = self.rules.get(rule_id)
                if rule:
                    recommendations.append(
                        f"Review {rule.name} compliance - {count} violations detected"
                    )
                    
        # Add general recommendations
        if any(v.severity == ComplianceLevel.CRITICAL for v in violations):
            recommendations.append("Immediate review required for critical violations")
            
        if len(violations) > 20:
            recommendations.append("Consider additional compliance training")
            
        return recommendations
        
    async def audit_trail_add(
        self,
        user_id: str,
        action: str,
        details: Dict,
        ip_address: Optional[str] = None
    ):
        """Add entry to audit trail"""
        
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "action": action,
            "details": details,
            "ip_address": ip_address,
            "hash": self.generate_audit_hash(user_id, action, details)
        }
        
        self.audit_trail.append(entry)
        
        # Store in database
        if self.db:
            await self.store_audit_entry(entry)
            
    def generate_audit_hash(self, user_id: str, action: str, details: Dict) -> str:
        """Generate tamper-proof hash for audit entry"""
        
        # Create hash of audit data
        data = f"{user_id}{action}{json.dumps(details, sort_keys=True)}"
        
        # Add previous hash for chain integrity
        if self.audit_trail:
            data += self.audit_trail[-1]["hash"]
            
        return hashlib.sha256(data.encode()).hexdigest()
        
    async def verify_audit_trail(self) -> bool:
        """Verify audit trail integrity"""
        
        for i, entry in enumerate(self.audit_trail):
            # Recalculate hash
            expected_hash = self.generate_audit_hash(
                entry["user_id"],
                entry["action"],
                entry["details"]
            )
            
            if entry["hash"] != expected_hash:
                logger.error(f"Audit trail tampering detected at entry {i}")
                return False
                
        return True
        
    async def export_regulatory_report(
        self,
        region: RegulatoryRegion,
        report_type: str,
        format: str = "json"
    ) -> bytes:
        """Export regulatory report in required format"""
        
        # Generate report based on region and type
        if region == RegulatoryRegion.AUSTRALIA:
            if report_type == "ASIC_TRANSACTION":
                data = await self.generate_asic_transaction_report()
            elif report_type == "ASIC_COMPLIANCE":
                data = await self.generate_asic_compliance_report()
                
        elif region == RegulatoryRegion.USA:
            if report_type == "SEC_FORM":
                data = await self.generate_sec_form()
            elif report_type == "FINRA_TRACE":
                data = await self.generate_finra_trace_report()
                
        elif region == RegulatoryRegion.EUROPE:
            if report_type == "MIFID_TRANSACTION":
                data = await self.generate_mifid_transaction_report()
                
        # Format output
        if format == "json":
            return json.dumps(data, indent=2).encode()
        elif format == "csv":
            df = pd.DataFrame(data)
            return df.to_csv(index=False).encode()
        elif format == "xml":
            return self.dict_to_xml(data).encode()
            
    async def monitor_realtime_compliance(self):
        """Real-time compliance monitoring"""
        
        while True:
            try:
                # Check for violations
                await self.check_active_violations()
                
                # Monitor suspicious patterns
                await self.detect_suspicious_patterns()
                
                # Process reporting queue
                await self.process_reporting_queue()
                
                # Update watchlists
                await self.update_watchlists()
                
                await asyncio.sleep(1)  # Check every second
                
            except Exception as e:
                logger.error(f"Compliance monitoring error: {e}")
                await asyncio.sleep(5)
                
    async def start_monitoring(self):
        """Start compliance monitoring"""
        if not self.monitoring_task:
            self.monitoring_task = asyncio.create_task(self.monitor_realtime_compliance())
            logger.info("Compliance monitoring started")
            
    async def stop_monitoring(self):
        """Stop compliance monitoring"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
            self.monitoring_task = None
            logger.info("Compliance monitoring stopped")
            
    # Helper methods (would connect to actual database)
    async def get_recent_orders(self, user_id: str, minutes: int) -> List[Dict]:
        """Get recent orders for user"""
        # Placeholder - would query database
        return []
        
    async def get_account_info(self, user_id: str) -> Dict:
        """Get account information"""
        # Placeholder - would query database
        return {"equity": 50000, "leverage": 1}
        
    async def count_day_trades(self, user_id: str, days: int) -> int:
        """Count day trades in period"""
        # Placeholder - would query database
        return 0
        
    async def get_trades(self, user_id: str, **filters) -> List[Dict]:
        """Get trades with filters"""
        # Placeholder - would query database
        return []
        
    async def get_recent_trades(self, user_id: str, minutes: int) -> List[Dict]:
        """Get recent trades"""
        # Placeholder - would query database
        return []
        
    async def get_portfolio(self, user_id: str) -> List[Dict]:
        """Get user portfolio"""
        # Placeholder - would query database
        return []
        
    async def flag_for_review(self, user_id: str, trade: Dict, reason: str):
        """Flag transaction for manual review"""
        logger.info(f"Flagged for review: {user_id} - {reason}")
        
    def is_unusual_hour(self, timestamp: datetime) -> bool:
        """Check if trading at unusual hour"""
        if timestamp:
            hour = timestamp.hour
            return hour < 6 or hour > 22
        return False
        
    async def is_trade_reported(self, trade_id: str) -> bool:
        """Check if trade has been reported"""
        # Placeholder - would check reporting status
        return False
        
    async def schedule_reporting(self, trade: Dict):
        """Schedule trade for regulatory reporting"""
        await self.reporting_queue.put(trade)
        
    async def store_violation(self, violation: ComplianceViolation):
        """Store violation in database"""
        # Placeholder - would store in database
        pass
        
    async def send_critical_alert(self, violation: ComplianceViolation):
        """Send alert for critical violation"""
        logger.critical(f"CRITICAL VIOLATION: {violation.rule_name} - {violation.description}")
        
    async def store_audit_entry(self, entry: Dict):
        """Store audit entry in database"""
        # Placeholder - would store in database
        pass
        
    async def check_active_violations(self):
        """Check for active violations"""
        # Placeholder - would check current state
        pass
        
    async def detect_suspicious_patterns(self):
        """Detect suspicious trading patterns"""
        # Placeholder - would analyze patterns
        pass
        
    async def process_reporting_queue(self):
        """Process regulatory reporting queue"""
        while not self.reporting_queue.empty():
            trade = await self.reporting_queue.get()
            # Process reporting
            
    async def update_watchlists(self):
        """Update sanctions and watchlists"""
        # Placeholder - would update from external sources
        pass
        
    def dict_to_xml(self, data: Dict) -> str:
        """Convert dictionary to XML"""
        # Simple XML conversion
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n<report>\n'
        for key, value in data.items():
            xml += f"  <{key}>{value}</{key}>\n"
        xml += '</report>'
        return xml
        
    # Regulatory report generators (placeholders)
    async def generate_asic_transaction_report(self) -> Dict:
        """Generate ASIC transaction report"""
        return {"report_type": "ASIC_TRANSACTION", "data": []}
        
    async def generate_asic_compliance_report(self) -> Dict:
        """Generate ASIC compliance report"""
        return {"report_type": "ASIC_COMPLIANCE", "data": []}
        
    async def generate_sec_form(self) -> Dict:
        """Generate SEC form"""
        return {"report_type": "SEC_FORM", "data": []}
        
    async def generate_finra_trace_report(self) -> Dict:
        """Generate FINRA TRACE report"""
        return {"report_type": "FINRA_TRACE", "data": []}
        
    async def generate_mifid_transaction_report(self) -> Dict:
        """Generate MiFID transaction report"""
        return {"report_type": "MIFID_TRANSACTION", "data": []}
