---
title: Party hierarchy
description: How HL and NM1 segments relate people and organizations in a 271.
---

A party hierarchy describes which person or organization a response context
refers to. `HL` supplies a hierarchical level and optional parent identifier;
`NM1` identifies the party associated with that level.

## HL parent-child relationships

The [single-benefit response](/examples/single-eb) contains three levels:

```text
HL*1**20*1~
HL*2*1*21*1~
HL*3*2*22*0~
```

- `HL01` numbers each level: `1`, `2`, and `3`.
- `HL02` identifies the parent. It is empty at the top level, then points to
  level `1` and level `2` in the following segments.
- `HL03` identifies the kind of level. The values shown are information source
  (`20`), information receiver (`21`), and subscriber (`22`).
- `HL04` indicates whether the level has children. The subscriber level uses
  `0` because it has no child level in this example.

See the public [HL field reference](https://www.stedi.com/edi/x12-005010/segment/HL).

## NM1 identifies the party

An `NM1` segment identifies the party at the current level:

```text
NM1*PR*2*CEDAR VALLEY HEALTH PLAN~
NM1*1P*2*OAK STREET MEDICAL GROUP~
NM1*IL*1*REED*JORDAN~
```

- `NM101` identifies the party's role: payer (`PR`), provider (`1P`), or
  insured or subscriber (`IL`) in these examples.
- `NM102=2` identifies the payer and provider as organizations. `NM102=1`
  identifies the subscriber as a person.
- `NM103` carries an organization name or a person's family name. `NM104`
  carries the person's given name when present.

See the public [NM1 field reference](https://www.stedi.com/edi/x12-005010/segment/NM1).

The sequence shows one hierarchy. Read `HL` and `NM1` together with the
transaction profile and companion guide to determine which relationships and
identity rules apply to your route.
