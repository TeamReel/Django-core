"""Example LangGraph workflow for testing."""

from typing import TypedDict

from .registry import register_graph


class SimpleCompletionState(TypedDict):
    """State for simple completion workflow."""

    prompt: str
    response: str | None
    error: str | None


@register_graph("simple_completion")
def create_simple_completion_graph():
    """Build a simple completion graph for testing.

    This graph demonstrates the basic pattern:
    1. Accept a prompt
    2. Generate a response (mock)
    3. Return the result

    Returns:
        Compiled StateGraph
    """
    try:
        from langgraph.graph import StateGraph
    except ImportError:
        # If LangGraph SDK not installed, return a mock
        return None

    # Define the graph
    graph = StateGraph(SimpleCompletionState)

    # Define node: generate response
    def generate_response(state: SimpleCompletionState) -> SimpleCompletionState:
        """Generate a simple response (mock implementation)."""
        prompt = state.get("prompt", "")
        if not prompt:
            return {**state, "error": "No prompt provided"}

        # Mock response generation
        response = f"Response to: {prompt}"
        return {**state, "response": response}

    # Add nodes
    graph.add_node("generate", generate_response)

    # Set entry and finish points
    graph.set_entry_point("generate")
    graph.set_finish_point("generate")

    # Compile and return
    return graph.compile()
