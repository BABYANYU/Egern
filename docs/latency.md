# ✦ Yanyu · Latency

Egern generic widget. Runs five rounds of HTTPS HEAD requests to Cloudflare generate_204, explicitly specifying each policy name. Shows request wall-clock median and median absolute deviation (MAD); not ICMP ping and not Surge round-one-total. Connection reuse and JS scheduling can affect timings. Successful samples require HTTP 204. Jitter requires three successes; partial samples are labelled. Up to three concurrent requests, four-second per-request timeout, fifty-second overall sampling budget. Slow/failing lists may not complete five rounds.

Install module: https://raw.githubusercontent.com/BABYANYU/Egern/main/modules/Latency.yaml

Module template parameter NODES is a list of existing node names separated by §. Keep names private in local module settings. Empty parameter measures Proxy only. Group members are not automatically enumerated or synced. No policy changes, no current-selection lookup and no actual-route metadata available: confirm routing in Egern connection logs before treating results as per-node tests. An unknown policy's runtime fallback behavior cannot be verified by this script.

The script queries whenever Egern runs it; no schedule is installed. WidgetKit may refresh a desktop widget, so manual-only execution is not guaranteed. Module/script update intervals download source code and do not control measurement frequency. Use medium/large widget for small lists; many nodes may be clipped.

Public repository contains no user's node list, server addresses or credentials. Local mocks validate five rounds, explicit policy options and error handling, not real-device routing, layout or timing accuracy.

Official references:
- https://egernapp.com/docs/javascript-api/
- https://egernapp.com/docs/configuration/widgets/
- https://egernapp.com/docs/configuration/modules/
