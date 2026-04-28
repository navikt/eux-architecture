# SED Embedding Map (CDM 4.3)

How SEDs travel **across BUCs** as sub-processes (HSUBS) and admin actions (XADMINS).

---

## 1. The Two Mechanisms (Mermaid)

```mermaid
flowchart LR
    subgraph "Sub-process embedding (HSUBS)"
        direction LR
        Owner["Any BUC<br/>(P_BUC, R_BUC, S_BUC, AW_BUC...)"] -->|"PO sends starter SED<br/>(onlyStarter=true)"| Spawn["Spawn child sub-BUC<br/>(H_BUC_0x)"]
        Spawn --> SubStart["Create starter SED<br/>(e.g. H001, H070)"]
    end
```

```mermaid
flowchart LR
    subgraph "Admin SED embedding (XADMINS)"
        direction LR
        Case["Case in any BUC"] -->|"PO action throughout case life"| Admin["Create admin SED<br/>(X005/X006/X007/X009)"]
    end
```

---

## 2. Cross-BUC Reach Heatmap

```
SED         Embedded in N BUCs    Bar (each █ = 1 BUC)
══════════════════════════════════════════════════════════════════
X007         66  ████████████████████████████████████████████████████████████████████
X009         58  ████████████████████████████████████████████████████████████
H001         50  ████████████████████████████████████████████████████
X005         24  ████████████████████████████
X006         19  ███████████████████████
H070         12  ████████████
H020          4  ████
H120          4  ████
H003-005      2  ██
H061          2  ██
H121          2  ██
H010          1  █
H011          1  █
H065          1  █
══════════════════════════════════════════════════════════════════
```

---

## 3. Where Each Cross-BUC SED Reaches (Mermaid)

### H001 — by far the most embedded SED (50 BUCs)

```mermaid
flowchart LR
    H001(((H001)))
    H001 --> AW[AW_BUC_*]
    H001 --> R[R_BUC_*]
    H001 --> S[S_BUC_*]
    H001 --> M[M_BUC_*]
    H001 --> H[H_BUC_03a-10]
    H001 --> LA[LA_BUC_02]
    H001 --> FB[FB_BUC_02]
    H001 --> UB[UB_BUC_01, _03]
    H001 -.starter.-> H_BUC_01[H_BUC_01<br/>own BUC]
    style H001 fill:#fde68a,stroke:#b45309
    style H_BUC_01 fill:#bbf7d0,stroke:#166534
```

### H070 — death notification (12 BUCs, mostly pensions)

```mermaid
flowchart LR
    H070(((H070)))
    H070 --> P[P_BUC_01, _02, _03, _05, _07, _08, _10]
    H070 --> R2[R_BUC_01, _02]
    H070 --> Other[FB_BUC_02, LA_BUC_02, UB_BUC_03]
    H070 -.starter.-> H_BUC_07[H_BUC_07<br/>own BUC]
    style H070 fill:#fde68a,stroke:#b45309
    style H_BUC_07 fill:#bbf7d0,stroke:#166534
```

### H020 (notify changes) and H120 (reimbursement) — 4 BUCs each

```mermaid
flowchart LR
    H020(((H020)))
    H020 --> A[H_BUC_10]
    H020 --> B[P_BUC_01, _03, _10]
    H020 -.starter.-> H_BUC_04
    H120(((H120)))
    H120 --> C[P_BUC_01, _02, _03, _10]
    H120 -.starter.-> H_BUC_08
    style H020 fill:#fde68a
    style H120 fill:#fde68a
    style H_BUC_04 fill:#bbf7d0
    style H_BUC_08 fill:#bbf7d0
```

### X-admin SEDs — universal

```mermaid
flowchart LR
    X007(((X007<br/>Forward Case))) -->|66 BUCs| AllBUCs1[Almost every BUC]
    X009(((X009<br/>Reminder))) -->|58 BUCs| AllBUCs2[Most BUCs with hasReminder=true]
    X005(((X005<br/>Add Participant))) -->|24 BUCs| AllBUCs3[BUCs allowing extra participants]
    X006(((X006<br/>Remove Participant))) -->|19 BUCs| AllBUCs4[Subset of X005 BUCs]
    style X007 fill:#fecaca
    style X009 fill:#fecaca
    style X005 fill:#fecaca
    style X006 fill:#fecaca
```

---

## 4. Big Picture: SED → BUC Family Reach (matrix)

Rows = embeddable SED. Columns = BUC family. Cell = number of BUCs in that family where this SED is embedded.

```
                    P    U    S    R    M    F    A   AW    H   total
H001 (info)         0    2    6    7    4    1    1   20    9      50
H070 (death)        7    1    0    2    0    1    1    0    0      12
H020 (changes)      3    0    0    0    0    0    0    0    1       4
H120 (reimb)        4    0    0    0    0    0    0    0    0       4
H003-005 (doc-req)  -    -    -    -    -    -    -    -    -       2
H061 (doc-check)    -    -    -    -    -    -    -    -    -       2
H121 (reimb-cont)   -    -    -    -    -    -    -    -    -       2
─────────────────────────────────────────────────────────────────────
X007 (forward)     ~10   4   ~24  7    4    3   ~5  ~24  ~10      66
X009 (reminder)    ~10   4   ~22  7    4    3   ~4  ~20   ~9      58
X005 (add part.)   varies                                          24
X006 (rem part.)   varies                                          19
```

---

## 5. Reverse View: What "carries" with each BUC family

```mermaid
flowchart TB
    subgraph PensionFamily["P_BUC family (P_BUC_01..10)"]
        direction LR
        P[P_BUC_*] --> Ph[Carries: H001, H020, H070, H120]
        P --> Px[Plus: X005, X006, X007, X009]
    end
    subgraph SicknessFamily["S_BUC family"]
        direction LR
        S[S_BUC_*] --> Sh[Carries: H001]
        S --> Sx[Plus: X007, X009]
    end
    subgraph RecoveryFamily["R_BUC family"]
        direction LR
        R[R_BUC_*] --> Rh[Carries: H001, H070]
        R --> Rx[Plus: X005, X007, X009]
    end
    subgraph AwFamily["AW_BUC family"]
        direction LR
        A[AW_BUC_*] --> Ah[Carries: H001]
        A --> Ax[Plus: X007, X009]
    end
    subgraph UbFamily["UB_BUC family"]
        direction LR
        U[UB_BUC_*] --> Uh[Carries: H001, H070]
        U --> Ux[Plus: X005, X007, X009]
    end
```

---

## 6. Decision Tree — "Why did this SED appear as a sakshandling?"

```mermaid
flowchart TD
    Start[I see SED X as a sakshandling on this case] --> Q1{Is X a starter SED<br/>of THIS BUC?}
    Q1 -->|Yes| A1["sakshandling = create the case's starter<br/>(only on fresh, empty cases)"]
    Q1 -->|No| Q2{Is X in HSUBS<br/>list of this BUC?}
    Q2 -->|Yes, X is H001/H020/H070/H120…| A2["sakshandling = spawn an<br/>embedded H_BUC sub-process<br/>(PO-only, onlyStarter=true)"]
    Q2 -->|No| Q3{Is X in XADMINS<br/>list of this BUC?}
    Q3 -->|Yes, X is X005/X006/X007/X009| A3["sakshandling = administrative action<br/>(usually PO-only)"]
    Q3 -->|No| Q4{Is X in POCREATED<br/>list of this BUC?}
    Q4 -->|Yes| A4[sakshandling = follow-up SED<br/>created by PO mid-case]
    Q4 -->|No| A5[Unexpected — log/investigate]
    style A1 fill:#bbf7d0
    style A2 fill:#fde68a
    style A3 fill:#fecaca
    style A4 fill:#bfdbfe
    style A5 fill:#e5e7eb
```

---

_Source: parsed `HSUBS` and `XADMINS` declarations in `eessi-rina-buc/buc-process/4.3/*/src/main/resources/bucs/po_*.xml` from the RINA-6.3 source._
