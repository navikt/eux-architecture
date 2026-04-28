# Svarsed Dependency Map (CDM 4.3)

**What this shows:** for every SED that already exists on a case, which **reply SED (svarsed)** can be created against it. This mirrors the runtime rule used by `RinasakOversiktV5Service.extractSvarSedInfo()`:

> A `Create` action with `parentDocumentId == <existing SED id>` and same family-letter as the parent.

**Source:** `<document type=PARENT> ... actionType="DOC_CREATE_REPLY" documentType=REPLY` triggers, scoped inside document blocks in the 4.3 BUC `po_*.xml` and `cp_*.xml` files. (Trigger-derived = authoritative; reflects what the runtime engine will offer.)

---

## Direct Reply Pairs (Parent SED → Svarsed)

### Pensions (P_BUC, P-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)                                           |
| ---------- | --------------------- | ------------------------------------------------ |
| P1000      | P1100                 | P_BUC_04                                         |
| P11000     | P12000                | P_BUC_07                                         |
| P12000     | P13000                | P_BUC_08                                         |
| P8000      | P9000                 | P_BUC_01, P_BUC_02, P_BUC_03, P_BUC_05, P_BUC_10 |

### Unemployment (UB_BUC, U-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)    |
| ---------- | --------------------- | --------- |
| U001       | U002                  | UB_BUC_01 |
| U001CB     | U017                  | UB_BUC_01 |
| U003       | U004                  | UB_BUC_01 |
| U005       | U006                  | UB_BUC_01 |
| U007       | U008                  | UB_BUC_02 |
| U010       | U011                  | UB_BUC_02 |
| U012       | U013                  | UB_BUC_02 |
| U018       | U019                  | UB_BUC_03 |
| U020       | U021                  | UB_BUC_04 |
| U020       | U023                  | UB_BUC_04 |
| U021       | U023                  | UB_BUC_04 |
| U023       | U021                  | UB_BUC_04 |
| U023       | U029                  | UB_BUC_04 |
| U024       | U025                  | UB_BUC_04 |
| U026       | U027                  | UB_BUC_04 |
| U029       | U021                  | UB_BUC_04 |
| U029       | U023                  | UB_BUC_04 |

### Sickness (S_BUC, S-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)                        |
| ---------- | --------------------- | ----------------------------- |
| S001       | S003                  | S_BUC_17                      |
| S006       | S007                  | S_BUC_18                      |
| S008       | S130                  | S_BUC_18                      |
| S009       | S010                  | S_BUC_08                      |
| S011       | S012                  | S_BUC_11                      |
| S014       | S015                  | S_BUC_07                      |
| S016       | S017                  | S_BUC_03                      |
| S018       | S019                  | S_BUC_04                      |
| S026       | S027                  | S_BUC_22                      |
| S030       | S031                  | S_BUC_22                      |
| S033       | S034                  | S_BUC_22                      |
| S035       | S037                  | S_BUC_09                      |
| S040       | S041                  | S_BUC_24                      |
| S044       | S045                  | S_BUC_05                      |
| S050       | S017                  | S_BUC_03                      |
| S050       | S019                  | S_BUC_04                      |
| S050       | S073                  | S_BUC_01, S_BUC_01A, S_BUC_02 |
| S050       | S130                  | S_BUC_18                      |
| S050       | S131                  | S_BUC_18A                     |
| S051       | S053A                 | S_BUC_23                      |
| S051       | S053C                 | S_BUC_23                      |
| S053C      | S053R                 | S_BUC_23                      |
| S056       | S057                  | S_BUC_15                      |
| S067       | S068                  | S_BUC_06                      |
| S071       | S072                  | S_BUC_01                      |
| S072       | S073                  | S_BUC_01A                     |
| S077       | S131                  | S_BUC_18A                     |
| S080       | S081                  | S_BUC_19                      |
| S082       | S083                  | S_BUC_19                      |
| S083       | S084                  | S_BUC_19                      |
| S087       | S088                  | S_BUC_19                      |
| S089       | S090                  | S_BUC_19                      |
| S091       | S092                  | S_BUC_19                      |
| S100       | S101                  | S_BUC_21                      |
| S102       | S103                  | S_BUC_21                      |
| S103       | S104                  | S_BUC_21                      |
| S107       | S108                  | S_BUC_21                      |
| S110       | S111                  | S_BUC_21                      |
| S112       | S113                  | S_BUC_21                      |
| S114       | S115                  | S_BUC_21                      |
| S116       | S117                  | S_BUC_21                      |

### Recovery (R_BUC, R-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)   |
| ---------- | --------------------- | -------- |
| R001       | R002                  | R_BUC_01 |
| R005       | R006                  | R_BUC_02 |
| R008       | R009                  | R_BUC_03 |
| R010       | R011                  | R_BUC_04 |
| R012       | R014                  | R_BUC_05 |
| R015       | R016                  | R_BUC_06 |
| R017       | R018                  | R_BUC_07 |
| R019       | R033                  | R_BUC_07 |
| R028       | R029                  | R_BUC_07 |

### Family Benefits (FB_BUC, F-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)    |
| ---------- | --------------------- | --------- |
| F001       | F002                  | FB_BUC_01 |
| F004       | F005                  | FB_BUC_01 |
| F016       | F017                  | FB_BUC_02 |
| F018       | F019                  | FB_BUC_03 |
| F022       | F023                  | FB_BUC_01 |
| F026       | F027                  | FB_BUC_01 |

### Medical (M_BUC, M-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)    |
| ---------- | --------------------- | --------- |
| M050       | M051                  | M_BUC_03A |
| M052       | M053                  | M_BUC_03B |

### Legislation Applicable (LA_BUC, A-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)                          |
| ---------- | --------------------- | ------------------------------- |
| A001       | A002                  | LA_BUC_01                       |
| A001       | A011                  | LA_BUC_01                       |
| A002       | A011                  | LA_BUC_01                       |
| A003       | A004                  | LA_BUC_02                       |
| A003       | A012                  | LA_BUC_02                       |
| A004       | A012                  | LA_BUC_02                       |
| A005       | A006                  | LA_BUC_01, LA_BUC_02, LA_BUC_06 |
| A011       | A002                  | LA_BUC_01                       |
| A012       | A004                  | LA_BUC_02                       |

### Accident at Work (AW_BUC, DA-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)                            |
| ---------- | --------------------- | --------------------------------- |
| DA001      | DA002                 | AW_BUC_01A                        |
| DA003      | DA003A                | AW_BUC_01A, AW_BUC_01B, AW_BUC_02 |
| DA004      | DA005                 | AW_BUC_03                         |
| DA006      | DA007                 | AW_BUC_04A                        |
| DA008      | DA007                 | AW_BUC_04B                        |
| DA010      | DA011                 | AW_BUC_05                         |
| DA012C     | DA012R                | AW_BUC_05                         |
| DA014      | DA015                 | AW_BUC_05                         |
| DA016      | DA016A                | AW_BUC_05                         |
| DA016A     | DA017                 | AW_BUC_05                         |
| DA018      | DA019                 | AW_BUC_05                         |
| DA020      | DA021                 | AW_BUC_15                         |
| DA022C     | DA022R                | AW_BUC_15                         |
| DA024      | DA025                 | AW_BUC_15                         |
| DA044      | DA042                 | AW_BUC_07C                        |
| DA046      | DA047                 | AW_BUC_07D                        |
| DA053      | DA054                 | AW_BUC_10B                        |
| DA057      | DA058                 | AW_BUC_11                         |
| DA059      | DA060                 | AW_BUC_12                         |
| DA062      | DA063                 | AW_BUC_14                         |
| DA071      | DA073A                | AW_BUC_23                         |
| DA071      | DA073C                | AW_BUC_23                         |
| DA073C     | DA073R                | AW_BUC_23                         |

### Horizontal sub-processes (H_BUC, H-series)

| Parent SED | → Reply SED (svarsed) | BUC(s)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H001       | H002                  | AW_BUC_01A, AW_BUC_01B, AW_BUC_02, AW_BUC_03, AW_BUC_04A, AW_BUC_04B, AW_BUC_04C, AW_BUC_06A, AW_BUC_06B, AW_BUC_06C, AW_BUC_07A, AW_BUC_07B, AW_BUC_07C, AW_BUC_07D, AW_BUC_08, AW_BUC_09A, AW_BUC_09B, AW_BUC_10A, AW_BUC_10B, AW_BUC_11, AW_BUC_12, AW_BUC_13, AW_BUC_14, FB_BUC_01, FB_BUC_02, FB_BUC_03, H_BUC_01, H_BUC_03A, H_BUC_03B, H_BUC_04, H_BUC_05, H_BUC_06, H_BUC_07, H_BUC_08, H_BUC_09, H_BUC_10, LA_BUC_01, LA_BUC_02, M_BUC_01, M_BUC_02, M_BUC_03A, M_BUC_03B, R_BUC_01, R_BUC_02, R_BUC_03, R_BUC_04, R_BUC_05, R_BUC_06, R_BUC_07, S_BUC_01, S_BUC_01A, S_BUC_02, S_BUC_03, S_BUC_04, S_BUC_05, S_BUC_06, S_BUC_07, S_BUC_08, S_BUC_09, S_BUC_11, S_BUC_12, S_BUC_14, S_BUC_14A, S_BUC_14B, S_BUC_15, S_BUC_17, S_BUC_17A, S_BUC_18, S_BUC_18A, S_BUC_24, UB_BUC_01, UB_BUC_02, UB_BUC_03, UB_BUC_04 |
| H003       | H004                  | FB_BUC_01, FB_BUC_02, FB_BUC_03, LA_BUC_01, LA_BUC_02, UB_BUC_03                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| H005       | H006                  | FB_BUC_01, FB_BUC_02, FB_BUC_03, H_BUC_02A, H_BUC_02B, LA_BUC_01, LA_BUC_02, UB_BUC_03                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| H011       | H012                  | FB_BUC_01, FB_BUC_02, FB_BUC_03, H_BUC_03B                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| H020       | H021                  | H_BUC_04, H_BUC_10, P_BUC_01, P_BUC_03, P_BUC_10                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| H061       | H062                  | FB_BUC_01, FB_BUC_02, FB_BUC_03, H_BUC_05, LA_BUC_01                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| H065       | H066                  | FB_BUC_01, H_BUC_06, LA_BUC_01, LA_BUC_02, UB_BUC_03                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| H120       | H121                  | FB_BUC_01, H_BUC_08, P_BUC_01, P_BUC_02, P_BUC_03, P_BUC_10, S_BUC_08, S_BUC_09, S_BUC_11                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| H130       | H131                  | H_BUC_10                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## Per-BUC SED Inventory

Showing the static SED layout of each BUC. Multiple starters/replies in a list mean any starter can be opened independently, and replies are matched at runtime by RINA based on the actual parent document — *not* by position in these lists.

| BUC        | Starter(s)                  | PO-created                                              | CP-created (replies)                             |
| ---------- | --------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| AW_BUC_01A | DA001                       | DA003A                                                  | DA002, DA003                                     |
| AW_BUC_01B | DA002                       | DA003                                                   | DA003A                                           |
| AW_BUC_02  | DA003                       | —                                                       | DA003A                                           |
| AW_BUC_03  | DA004                       | —                                                       | DA005                                            |
| AW_BUC_04A | DA006                       | —                                                       | DA007                                            |
| AW_BUC_04B | DA008                       | —                                                       | DA007                                            |
| AW_BUC_06A | DA031                       | —                                                       | —                                                |
| AW_BUC_06B | DA040                       | —                                                       | —                                                |
| AW_BUC_06C | DA041                       | —                                                       | —                                                |
| AW_BUC_07A | DA042                       | —                                                       | —                                                |
| AW_BUC_07B | DA043                       | —                                                       | —                                                |
| AW_BUC_08  | DA048                       | DA049                                                   | —                                                |
| AW_BUC_09A | DA050                       | —                                                       | —                                                |
| AW_BUC_09B | DA051                       | —                                                       | —                                                |
| AW_BUC_10A | DA052                       | DA055                                                   | —                                                |
| AW_BUC_10B | DA053                       | —                                                       | DA054                                            |
| AW_BUC_11  | DA057                       | —                                                       | DA058                                            |
| AW_BUC_12  | DA059                       | —                                                       | DA060                                            |
| AW_BUC_13  | DA061                       | —                                                       | —                                                |
| AW_BUC_14  | DA062                       | —                                                       | DA063                                            |
| FB_BUC_02  | F016                        | —                                                       | F017                                             |
| FB_BUC_04  | F003                        | —                                                       | —                                                |
| H_BUC_01   | H001                        | —                                                       | H002                                             |
| H_BUC_02A  | H005                        | H003                                                    | H006                                             |
| H_BUC_02B  | H004                        | H005, H006, H003                                        | H004, H005, H006, H003                           |
| H_BUC_02C  | H003                        | —                                                       | —                                                |
| H_BUC_03A  | H010                        | —                                                       | —                                                |
| H_BUC_03B  | H011                        | —                                                       | H012                                             |
| H_BUC_04   | H020                        | —                                                       | H021                                             |
| H_BUC_05   | H061                        | —                                                       | H062                                             |
| H_BUC_06   | H065                        | —                                                       | H066                                             |
| H_BUC_07   | H070                        | —                                                       | —                                                |
| H_BUC_08   | H120                        | —                                                       | H121                                             |
| H_BUC_09   | H121                        | —                                                       | —                                                |
| H_BUC_10   | H130                        | —                                                       | H131                                             |
| LA_BUC_02  | A003                        | A005, A006, A007, A008                                  | A004, A005, A006, A007, A008, A012               |
| LA_BUC_03  | A008                        | —                                                       | —                                                |
| LA_BUC_04  | A009                        | —                                                       | —                                                |
| LA_BUC_05  | A010                        | —                                                       | —                                                |
| M_BUC_01   | M030                        | —                                                       | —                                                |
| M_BUC_02   | M040                        | —                                                       | —                                                |
| M_BUC_03A  | M050                        | —                                                       | M051                                             |
| M_BUC_03B  | M052                        | —                                                       | M053                                             |
| P_BUC_01   | P2000                       | P3000, P4000, P5000, P6000, P7000, P8000, P9000, P10000 | P5000, P6000, P8000, P9000, P10000               |
| P_BUC_02   | P2100                       | P3000, P4000, P5000, P6000, P7000, P8000, P9000, P10000 | P5000, P6000, P8000, P9000, P10000               |
| P_BUC_03   | P2200                       | P3000, P4000, P5000, P6000, P7000, P8000, P9000, P10000 | P5000, P6000, P8000, P9000, P10000               |
| P_BUC_04   | P1000                       | —                                                       | P1100                                            |
| P_BUC_05   | P8000                       | P4000, P5000, P6000, P7000, P9000                       | P4000, P5000, P6000, P7000, P8000, P9000         |
| P_BUC_06   | P5000, P6000, P7000, P10000 | —                                                       | —                                                |
| P_BUC_07   | P11000                      | P13000                                                  | P12000                                           |
| P_BUC_08   | P12000                      | —                                                       | P13000                                           |
| P_BUC_09   | P14000                      | —                                                       | —                                                |
| P_BUC_10   | P15000                      | P6000, P7000, P3000, P4000, P5000, P8000, P9000, P10000 | P6000, P3000, P4000, P5000, P8000, P9000, P10000 |
| R_BUC_01   | R001                        | R003                                                    | R002, R004                                       |
| R_BUC_02   | R005                        | —                                                       | R004, R006                                       |
| R_BUC_03   | R008                        | —                                                       | R004, R009                                       |
| R_BUC_04   | R010                        | —                                                       | R004, R011                                       |
| R_BUC_05   | R012                        | —                                                       | R014                                             |
| R_BUC_06   | R015                        | —                                                       | R016                                             |
| R_BUC_07   | R017                        | R025, R019, R034, R033, R036, R029, R004                | R018, R028, R004, R019, R034, R033               |
| S_BUC_01A  | S072                        | S050                                                    | S073                                             |
| S_BUC_03   | S016                        | S050                                                    | S017                                             |
| S_BUC_05   | S044                        | —                                                       | S045                                             |
| S_BUC_14A  | S047                        | —                                                       | —                                                |
| S_BUC_14B  | S048                        | —                                                       | —                                                |
| S_BUC_17   | S001                        | —                                                       | S003                                             |
| UB_BUC_01  | U001, U001CB, U003, U005    | —                                                       | U002, U017, U006, U004                           |
| UB_BUC_03  | U018                        | —                                                       | U019                                             |

---

## Diagram: Reply Chains in Common BUCs

```
P_BUC_07:   P11000  ──reply──▶  P12000  ──reply──▶  P13000
P_BUC_08:                       P12000  ──reply──▶  P13000
P_BUC_04:   P1000   ──reply──▶  P1100

UB_BUC_01:  U001    ──reply──▶  U002
            U001CB  ──reply──▶  U017
            U003    ──reply──▶  U004
            U005    ──reply──▶  U006
UB_BUC_03:  U018    ──reply──▶  U019

S_BUC_17:   S001    ──reply──▶  S003
S_BUC_03:   S016    ──reply──▶  S017
S_BUC_05:   S044    ──reply──▶  S045
S_BUC_01a:  S072    ──reply──▶  S073

R_BUC_01:   R001    ──reply──▶  R002, R003, R004
R_BUC_02:   R005    ──reply──▶  R004, R006

FB_BUC_02:  F016    ──reply──▶  F017
FB_BUC_04:  F002 (received) ──reply──▶  F003   (special-case in app code)

M_BUC_03a:  M050    ──reply──▶  M051
M_BUC_03b:  M052    ──reply──▶  M053

H_BUC_01:   H001    ──reply──▶  H002
H_BUC_04:   H020    ──reply──▶  H021
H_BUC_05:   H061    ──reply──▶  H062
H_BUC_06:   H065    ──reply──▶  H066
H_BUC_08:   H120    ──reply──▶  H121
H_BUC_10:   H130    ──reply──▶  H131

Cross-BUC (engine-managed):
            X001 (Close) ──reply──▶ X002 (Reopen) ──reply──▶ X003 (Agree) ──▶ X004 (Confirm)
```

_Total trigger-derived parent→reply pairs: **122**_
