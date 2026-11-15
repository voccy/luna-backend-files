"""Exploratory geomorphology candidates from LOLA DEM grids.

These are reproducible geometric heuristics, not geological classifications.
"""
from __future__ import annotations
import numpy as np

def identify_surface_features(elevations_m, spacing_m, crater_min_radius_m=40.0,
                             crater_max_radius_m=500.0, ridge_prominence_m=5.0):
    a=np.asarray([[np.nan if v is None else float(v) for v in row] for row in elevations_m],dtype=float)
    if a.ndim!=2 or min(a.shape)<7 or spacing_m<=0: raise ValueError("A valid 7x7+ DEM and positive spacing are required")
    h,w=a.shape
    finite=np.isfinite(a)
    # Depression candidates: center lower than a surrounding annulus, with a
    # raised/level rim. Multiple scales; avoid claiming impact origin.
    craters=[]
    radii=sorted(set([max(2,int(round(r/spacing_m))) for r in (crater_min_radius_m,100,200,crater_max_radius_m)]))
    for rad in radii:
        if rad<2 or rad>min(h,w)//4: continue
        step=max(1,rad//2)
        for y in range(rad,h-rad,step):
            for x in range(rad,w-rad,step):
                if not finite[y,x]: continue
                yy,xx=np.ogrid[:h,:w]; rr=np.sqrt((yy-y)**2+(xx-x)**2)
                inner=(rr<=max(1,rad*.35)); ann=(rr>=rad*.7)&(rr<=rad*1.25)
                if not np.all(finite[y-rad:y+rad+1,x-rad:x+rad+1]): continue
                center=float(a[y,x]); rim=float(np.nanmedian(a[ann])); floor=float(np.nanmedian(a[inner]))
                depth=rim-floor
                if depth>=max(2.0,spacing_m*.15):
                    craters.append({"center_grid":[int(y),int(x)],"approx_diameter_m":round(2*rad*spacing_m,1),
                                    "rim_to_floor_relief_m":round(depth,2),"center_elevation_m":round(center,2),
                                    "classification":"depression candidate; impact origin unconfirmed"})
    # Deduplicate nearby overlapping detections, retaining strongest relief.
    craters.sort(key=lambda q:q["rim_to_floor_relief_m"],reverse=True); kept=[]
    for c in craters:
        y,x=c["center_grid"]
        if not any(np.hypot(y-v["center_grid"][0],x-v["center_grid"][1])<max(2,c["approx_diameter_m"]/(4*spacing_m)) for v in kept): kept.append(c)
    # Ridge candidates: local high points relative to a 5-cell neighborhood median.
    ridges=[]
    for y in range(2,h-2):
        for x in range(2,w-2):
            patch=a[y-2:y+3,x-2:x+3]
            if not np.isfinite(a[y,x]) or not np.isfinite(patch).all(): continue
            prom=float(a[y,x]-np.median(patch))
            if prom>=ridge_prominence_m:
                ridges.append({"grid":[y,x],"elevation_m":round(float(a[y,x]),2),
                               "local_prominence_m":round(prom,2),
                               "classification":"local high-point / ridge candidate"})
    ridges.sort(key=lambda q:q["local_prominence_m"],reverse=True)
    return {"crater_candidates":kept[:100],"ridge_candidates":ridges[:100],
            "method":"Multi-scale local depression and local-relief heuristics on supplied sampled DEM",
            "limitations":"Candidates depend on grid spacing, radius thresholds, DEM coverage and noise. They are not validated craters, mountains, or geological units."}

def classify_shadow_epochs(shadow_masks):
    """Conservative PSR screening: all supplied epoch masks must be shadowed."""
    if not shadow_masks: raise ValueError("At least two independently dated solar-geometry masks are required")
    arrays=[np.asarray(m,dtype=object) for m in shadow_masks]
    if len(arrays)<2 or any(a.shape!=arrays[0].shape for a in arrays): raise ValueError("At least two same-sized epoch masks are required")
    stack=np.stack([np.vectorize(lambda x: -1 if x is None else int(bool(x)))(a) for a in arrays])
    known=np.all(stack>=0,axis=0)
    psr=known & np.all(stack==1,axis=0)
    return {"permanently_shadowed_candidate_mask":psr.tolist(),
            "candidate_cell_count":int(psr.sum()),"evaluated_epoch_count":len(arrays),
            "method":"Intersection of terrain-shadow masks at supplied solar epochs",
            "limitations":"This is only a candidate screen. Permanence requires validated multi-year seasonal illumination modelling, adequate polar DEM coverage, uncertainty propagation and independent review."}
