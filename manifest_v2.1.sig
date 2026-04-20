{
  "schema": "UNIFED-PROBATUM-MANIFEST/2.1",
  "generated_at": "2026-04-19T00:00:00Z",
  "fase": 3,
  "nome_fase": "Logging de Proveniência e Selagem Forense de Runtime",
  "master_hash_fase1_2": "72760dfde44902ffdbd234160b8c53d9a354dd852c8000ca65b3b6f9394c8fec",
  "master_hash_fase3": "854b9a98986e80415a336a687498fc8a2d7afa3f191e238622732f2dc55c0408",
  "metodo_master_hash": "SHA-256(concat(SHA-256(f_i) para i=1..19, ordem canónica))",
  "ficheiros_fase3": [
    {
      "nome": "provenance_logger.js",
      "hash_sha256": "5af064e35a6e60311d1716d1f12ffa24584cd150a81e0d2d01d360a0a7def7d8",
      "linhas": 321,
      "funcoes_publicas": [
        "signEvent()",
        "chainIntegrity()",
        "exportAuditTrail()",
        "install()"
      ]
    },
    {
      "nome": "forensic_seal_engine.js",
      "hash_sha256": "85feec20e0c56b0c8865228dd78e2726464c123177bcecdd535ffc313bdef1de",
      "linhas": 175,
      "funcoes_publicas": [
        "sealResult()",
        "verifySession()"
      ]
    }
  ],
  "conformidade": [
    "Art. 158.º CPP",
    "Art. 163.º CPP",
    "ISO/IEC 27037:2012",
    "DORA (UE) 2022/2554"
  ],
  "nota": "Este manifesto é auto-gerado. Requer assinatura de Perito Nomeado (Art. 158.º CPP) antes de junção aos autos."
}