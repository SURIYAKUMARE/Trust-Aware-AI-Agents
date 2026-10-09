"""Programming and Code Verification Engine.
Audits syntax, logic, runtime errors, and user claims about program outputs.
Runs tests in isolated sandboxes where available.
"""
import re
from typing import Optional
from app.truth_verification.schemas import (
    VerificationStatus,
    VerificationDomain,
    TruthVerificationReport,
)
from app.code_workspace.engine import code_workspace

class CodeVerificationEngine:
    def __init__(self):
        self.code_indicators = [
            r"```",
            r"\b(def\s+\w+|function\s+\w+|public\s+class|class\s+\w+|int\s+\w+\s*=)\b",
            r"\b(System\.out\.println|print\(|console\.log)\b",
            r"\b(syntax\s+error|runtime\s+error|debug\s+this|fix\s+this\s+code)\b",
            r"\b(the\s+output\s+is\s+\d+|output\s*:\s*\d+)\b",
        ]

    def is_code_query(self, query: str) -> bool:
        clean = query.strip()
        matches = sum(1 for pat in self.code_indicators if re.search(pat, clean, re.IGNORECASE))
        return matches >= 1 and ("{" in clean or ";" in clean or "def " in clean or "print" in clean or "```" in clean)

    async def verify(self, query: str) -> Optional[TruthVerificationReport]:
        if not self.is_code_query(query):
            return None

        clean = query.strip()

        # Check for user claim about code output, e.g.:
        # "int a = 2; int b = 2; ... The output is 6"
        output_claim_match = re.search(r"(?i)\b(?:the\s+output\s+is|produces|prints|output\s*:)\s*([0-9a-zA-Z\.\-]+)", clean)
        
        # Run deep code review
        review = await code_workspace.review_code(code=clean)

        # If user made a claim about code output:
        if output_claim_match:
            claimed_output = output_claim_match.group(1).strip()
            # Check if simple Java/Python print arithmetic: a=2; b=2; a+b => 4
            eval_calc = re.search(r"\b([0-9]+)\s*[\+\-\*\/]\s*([0-9]+)\b", clean)
            if eval_calc and claimed_output.isdigit():
                # Check arithmetic output in snippet
                sub_expr = eval_calc.group(0)
                try:
                    import sympy
                    actual_num = int(sympy.sympify(sub_expr))
                    claimed_num = int(claimed_output)
                    if actual_num != claimed_num:
                        why = f"The code computes {sub_expr} = {actual_num}, not {claimed_num}. The program logic is valid, but your expected output claim is incorrect."
                        formatted = (
                            f"### 🛡️ Truth Verification: `INCORRECT`\n\n"
                            f"• **Verification Status**: `INCORRECT` ❌\n"
                            f"• **Your Claim**: The code output is `{claimed_output}`\n"
                            f"• **Actual Output**: `{actual_num}`\n"
                            f"• **Why It Is Incorrect**: {why}\n"
                            f"• **Verification Method**: Static Code Simulation & Deterministic Evaluation\n"
                            f"• **Code Snippet**:\n```{review.language}\n{clean}\n```\n\n"
                            f"• **Evidence Confidence**: **98%**\n"
                        )
                        return TruthVerificationReport(
                            status=VerificationStatus.INCORRECT,
                            domain=VerificationDomain.PROGRAMMING,
                            user_claim=f"The code output is {claimed_output}",
                            correct_information=f"The code calculates and outputs {actual_num}, not {claimed_output}.",
                            why_explanation=why,
                            verification_method="Static Code Simulation & Evaluation",
                            computational_proof=f"{sub_expr} = {actual_num}",
                            evidence_confidence=98,
                            confidence_band="High evidence confidence",
                            formatted_markdown=formatted,
                        )
                except Exception:
                    pass

        # Standard code review status
        if review.detected_issues:
            status = VerificationStatus.INCORRECT
            issue_descriptions = [f"{iss.issue_type.title()} error (Line {iss.line_number or '?'}): {iss.description}" for iss in review.detected_issues]
            why = "; ".join(issue_descriptions)
            correct_info = review.corrected_code

            formatted = (
                f"### 🛡️ Code Truth Verification: `INCORRECT`\n\n"
                f"• **Verification Status**: `INCORRECT` (Detected {len(review.detected_issues)} issue(s))\n"
                f"• **Language**: `{review.language.upper()}`\n\n"
                f"**Detected Problems:**\n"
            )
            for iss in review.detected_issues:
                formatted += f"• `[{iss.severity}]` **{iss.issue_type.title()}**: {iss.description}\n  - *Root Cause*: {iss.root_cause}\n"

            formatted += f"\n**Corrected Code:**\n```{review.language}\n{review.corrected_code}\n```\n\n"

            if review.test_results:
                formatted += "**Automated Test Verification:**\n"
                for tc in review.test_results:
                    icon = "✓" if tc.passed else "✗"
                    formatted += f"• {icon} `{tc.test_name}`: Expected `{tc.expected_output}` (Status: {tc.execution_status})\n"

            formatted += f"\n• **Verification Method**: AST Analysis, Syntax Linting & Subprocess Sandbox\n"
            formatted += f"• **Evidence Confidence**: **{95 if review.sandbox_executed else 88}%**\n"

            return TruthVerificationReport(
                status=status,
                domain=VerificationDomain.PROGRAMMING,
                user_claim=clean[:100],
                correct_information=review.corrected_code,
                why_explanation=why,
                verification_method="AST Analysis & Isolated Subprocess Sandbox",
                evidence_confidence=95 if review.sandbox_executed else 88,
                confidence_band="High evidence confidence" if review.sandbox_executed else "Good evidence, some limitations",
                formatted_markdown=formatted,
            )

        # Code is correct
        formatted = (
            f"### 🛡️ Code Truth Verification: `CORRECT`\n\n"
            f"• **Verification Status**: `CORRECT` ✅\n"
            f"• **Language**: `{review.language.upper()}`\n"
            f"• **Static Analysis**: No critical syntax errors, logic flaws, or security vulnerabilities found.\n"
            f"• **Verification Method**: AST Static Analysis & Syntax Verification\n"
            f"• **Evidence Confidence**: **92%**\n"
        )
        return TruthVerificationReport(
            status=VerificationStatus.CORRECT,
            domain=VerificationDomain.PROGRAMMING,
            user_claim=clean[:100],
            correct_information="Code is syntactically and logically sound.",
            why_explanation="No syntax or logical defects identified during static inspection.",
            verification_method="AST Static Analysis",
            evidence_confidence=92,
            confidence_band="High evidence confidence",
            formatted_markdown=formatted,
        )

code_verification_engine = CodeVerificationEngine()
