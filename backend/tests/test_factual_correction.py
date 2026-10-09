import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.verification.classifier import question_classifier, QueryIntent
from app.verification.pipeline import verification_pipeline

def test_classification_of_false_premise_question():
    res = question_classifier.classify("Australia's capital is Sydney, right?")
    assert res.requires_search is True
    assert any(ent.lower() in ["australia", "capital", "sydney"] for ent in res.extracted_entities)

def test_classification_of_direct_question():
    res = question_classifier.classify("Who is the President of India?")
    assert res.intent == QueryIntent.CURRENT_FACT
    assert res.requires_search is True

def test_factual_correction_australia_capital():
    res = asyncio.run(verification_pipeline.execute("Australia's capital is Sydney, right?"))
    answer = res.final_answer.lower()
    # Must identify Canberra as the actual capital
    assert "canberra" in answer
    # Must indicate Sydney is not the capital or state Canberra is the capital
    assert ("incorrect" in answer or "not sydney" in answer or "canberra" in answer)
