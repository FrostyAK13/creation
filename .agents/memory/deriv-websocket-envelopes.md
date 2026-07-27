---
name: Deriv websocket envelopes
description: The vendored Deriv API observable wraps websocket responses under a data property.
---

Deriv websocket subscribers in this project should read response payloads from `message.data` before checking `msg_type`, `tick`, or `proposal_open_contract`. A direct-response fallback is useful for isolated mocks. Quote display and digit extraction must preserve supplied digits rather than rounding with `toFixed`; only missing trailing zeroes may be padded from known pip precision.

**Why:** The Over/Under engine originally subscribed to the observable but read the outer object, so live digits and entry triggers never saw incoming ticks.

**How to apply:** Normalize messages at the subscription boundary, then filter tick events by symbol and use the market pip precision when extracting the final digit.