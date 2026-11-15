# NASA SPICE kernel installation status — 14 November 2026

All five NAIF-format kernel files are present in `science_api/kernels/`:

- `de421.bsp`
- `moon_pa_de421_1900-2050.bpc`
- `moon_080317.tf`
- `naif0012.tls`
- `pck00011.tpc`

`pck00011.tpc` SHA-256: `3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1`.

`python scripts/verify_data_integrity.py` passed in the integration environment, verifying all five recorded kernel checksums and the five Site01 raster checksums. This verifies the shipped files against the included manifest, not independently against NASA's live published checksums.

SpiceyPy is not installed in the packaging runtime, so loading the kernels through CSPICE, ephemeris numerical calculations, and NAIF reference-epoch comparisons remain unverified. Install `science_api/requirements.txt`, then run `python scripts/verify_spice.py`.
