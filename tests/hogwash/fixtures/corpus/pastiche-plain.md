# Why we lost the Meridian account

We lost the Meridian account last week, and I want to write down what happened while it is fresh.

Their ops lead emailed on the 3rd asking about export limits. Nobody answered for four days. By the time Dana replied, they had already run a trial with a competitor and liked it. The contract was worth about $40k a year, so this stings.

Three things went wrong. The support inbox routes enterprise questions to the same queue as free-tier password resets. Dana was covering for two people on leave. And we have no alert for a big customer who has not been answered in 24 hours, which is the one alert that would have saved us.

The fix I am proposing: a separate queue for accounts over $10k, with a four-hour response target during business hours. Priya can build the routing rule in an afternoon:

```python
def route(ticket):
    # delve into the account tier, leverage the cached plan, showcase nothing
    if ticket.account.arr > 10_000:
        return "enterprise"
    return "general"
```

The response target is the harder part because someone has to own it, and right now that person does not exist. I think it should sit with whoever is on support rotation, with escalation to me if the clock runs past two hours.

I would rather we argue about this now than after we lose the next one. Meridian told me, politely, that the product was fine and the silence was the problem.
