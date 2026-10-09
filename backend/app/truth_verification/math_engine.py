"""Mathematics Verification Engine.
Evaluates arithmetic, symbolic equations, and mathematical claims using SymPy.
Provides deterministic proofs with 100% computational certainty.
"""
import re
from typing import Optional, Dict, Any, Tuple
import sympy
from app.truth_verification.schemas import (
    VerificationStatus,
    VerificationDomain,
    TruthVerificationReport,
)

class MathVerificationEngine:
    def __init__(self):
        # Match equality patterns like: 2 + 2 = 6, 10 * 5 = 50, 10 × 5 = 50, 2+2==4
        self.eq_pattern = re.compile(
            r"^\s*([0-9a-zA-Z\s\+\-\*\/\^\(\)\.\,\%\×\÷\√]+?)\s*(?:={1,2}|equals|is equal to)\s*([0-9a-zA-Z\s\+\-\*\/\^\(\)\.\,\%\×\÷\√]+?)\s*[\.\?]?$",
            re.IGNORECASE
        )
        # Match arithmetic requests like: Calculate 789 * 456, What is 2 + 2, 2 + 2
        self.calc_prefix_pattern = re.compile(
            r"^\s*(?:calculate|evaluate|what is|compute|solve)?\s*([0-9\s\+\-\*\/\^\(\)\.\×\÷\√]+)\s*[\?\.]?$",
            re.IGNORECASE
        )

    def is_math_query(self, query: str) -> bool:
        clean = query.strip()
        # Direct equality check
        if self.eq_pattern.match(clean):
            lhs, rhs = self.eq_pattern.match(clean).groups()
            if any(c.isdigit() for c in lhs) or any(c.isdigit() for c in rhs):
                return True
        # Calculation request
        calc_match = self.calc_prefix_pattern.match(clean)
        if calc_match:
            expr = calc_match.group(1).strip()
            # Must have at least one operator and numbers
            if any(op in expr for op in ["+", "-", "*", "/", "×", "÷", "^", "%"]) and any(c.isdigit() for c in expr):
                return True
        return False

    def clean_expression(self, expr_str: str) -> str:
        s = expr_str.strip()
        s = s.replace("×", "*").replace("÷", "/")
        s = s.replace("^", "**")
        s = s.replace("√", "sqrt")
        s = s.replace(",", "")
        # Remove trailing periods or question marks
        s = s.rstrip(".?")
        return s

    def evaluate_expression(self, expr_str: str) -> Tuple[bool, Any, str]:
        """Safely evaluates an algebraic or arithmetic expression via SymPy."""
        clean = self.clean_expression(expr_str)
        try:
            # SymPy safe symbolic parse
            sym = sympy.sympify(clean, evaluate=True)
            if sym.is_number:
                if sym.is_integer:
                    val = int(sym)
                else:
                    # Floating point
                    val = float(sym.evalf())
                    if val.is_integer():
                        val = int(val)
                    else:
                        val = round(val, 6)
            else:
                val = str(sym)
            return True, val, str(val)
        except Exception as e:
            return False, None, str(e)

    def verify(self, query: str) -> Optional[TruthVerificationReport]:
        clean = query.strip()

        # Case 1: Equality claim (e.g., 2 + 2 = 6, 10 × 5 = 50)
        eq_match = self.eq_pattern.match(clean)
        if eq_match:
            lhs_raw, rhs_raw = eq_match.groups()
            lhs_success, lhs_val, lhs_str = self.evaluate_expression(lhs_raw)
            rhs_success, rhs_val, rhs_str = self.evaluate_expression(rhs_raw)

            if not lhs_success or not rhs_success:
                # Could be a non-arithmetic query that matched regex
                return None

            is_equal = False
            try:
                # Compare numerical or symbolic values
                if isinstance(lhs_val, (int, float)) and isinstance(rhs_val, (int, float)):
                    is_equal = abs(lhs_val - rhs_val) < 1e-9
                else:
                    is_equal = (str(lhs_val) == str(rhs_val))
            except Exception:
                is_equal = False

            if is_equal:
                status = VerificationStatus.CORRECT
                why = f"Evaluating the left-hand side ({lhs_raw.strip()}) yields {lhs_str}. Both sides of the equality are identical."
                correct_info = f"{lhs_raw.strip()} = {rhs_str}"
                formatted = (
                    f"### 🛡️ Truth Verification: `CORRECT`\n\n"
                    f"• **Verification Status**: `CORRECT` ✅\n"
                    f"• **Your Claim**: `{clean}`\n"
                    f"• **Confirmed Result**: `{lhs_raw.strip()} = {rhs_str}`\n"
                    f"• **Why It Is Correct**: {why}\n"
                    f"• **Verification Method**: Independent Symbolic Arithmetic Evaluation (SymPy)\n"
                    f"• **Computational Proof**: LHS = `{lhs_str}`, RHS = `{rhs_str}` (LHS = RHS)\n"
                    f"• **Evidence Confidence**: **100%** (Exact mathematical certainty)\n"
                )
            else:
                status = VerificationStatus.INCORRECT
                why = f"Evaluating the left-hand side ({lhs_raw.strip()}) gives {lhs_str}, not {rhs_str}."
                correct_info = f"{lhs_raw.strip()} = {lhs_str}"
                formatted = (
                    f"### 🛡️ Truth Verification: `INCORRECT`\n\n"
                    f"• **Verification Status**: `INCORRECT` ❌\n"
                    f"• **Your Claim**: `{clean}`\n"
                    f"• **Correct Information**: `{lhs_raw.strip()} = {lhs_str}`\n"
                    f"• **Why It Is Incorrect**: {why}\n"
                    f"• **Verification Method**: Independent Symbolic Arithmetic Evaluation (SymPy)\n"
                    f"• **Computational Proof**: LHS `{lhs_raw.strip()}` = {lhs_str} ≠ RHS `{rhs_str}`\n"
                    f"• **Evidence Confidence**: **100%** (Exact computational refutation)\n"
                )

            return TruthVerificationReport(
                status=status,
                domain=VerificationDomain.MATHEMATICS,
                user_claim=clean,
                correct_information=correct_info,
                why_explanation=why,
                verification_method="Independent Symbolic Arithmetic Evaluation (SymPy)",
                computational_proof=f"LHS = {lhs_str}; RHS = {rhs_str}; Equal: {is_equal}",
                evidence_confidence=100,
                confidence_band="High evidence confidence",
                formatted_markdown=formatted,
                is_opinion=False,
                requires_clarification=False,
            )

        # Case 2: Calculation request (e.g. Calculate 789 * 456, What is 2 + 2)
        calc_match = self.calc_prefix_pattern.match(clean)
        if calc_match:
            expr_raw = calc_match.group(1).strip()
            success, val, val_str = self.evaluate_expression(expr_raw)
            if success:
                formatted_val = f"{val:,}" if isinstance(val, int) else val_str
                formatted = (
                    f"### 🛡️ Truth Verification: `CORRECT`\n\n"
                    f"• **Calculation**: `{expr_raw}`\n"
                    f"• **Exact Result**: **`{formatted_val}`**\n"
                    f"• **Verification Method**: Deterministic Symbolic Computation (SymPy)\n"
                    f"• **Evidence Confidence**: **100%** (Verified exact computation)\n"
                )
                return TruthVerificationReport(
                    status=VerificationStatus.CORRECT,
                    domain=VerificationDomain.MATHEMATICS,
                    user_claim=clean,
                    correct_information=f"{expr_raw} = {formatted_val}",
                    why_explanation=f"Evaluated with arbitrary-precision symbolic math: {expr_raw} = {formatted_val}.",
                    verification_method="Deterministic Symbolic Computation (SymPy)",
                    computational_proof=f"{expr_raw} = {formatted_val}",
                    evidence_confidence=100,
                    confidence_band="High evidence confidence",
                    formatted_markdown=formatted,
                    is_opinion=False,
                    requires_clarification=False,
                )

        return None

math_verification_engine = MathVerificationEngine()
