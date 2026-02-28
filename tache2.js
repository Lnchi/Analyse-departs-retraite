// ============================================================
// TÂCHE 2 : ANALYSE DES PROFILS CSP (Nuage de points)
// ============================================================

// Fonction utilitaire pour couper le texte en deux lignes proprement
function splitText(text, maxLength = 25) {
    if (text.length <= maxLength) return [text, ""];
    let index = text.lastIndexOf(" ", maxLength);
    if (index === -1) index = maxLength;
    return [text.substring(0, index), text.substring(index).trim()];
}

d3.dsv(";", "departretraite_parcsp.csv").then((data) => {

    // --- 1. NETTOYAGE DES DONNÉES ---
    data.forEach(d => {
        d.age_depart = +d["Âge conjoncturel de départ à la retraite"].replace(",", ".");
        d.retraites61 = +d["Proportion de retraités à 61 ans"];
        d.duree_sans_emploi = +d["Durée moyenne sans emploi ni retraite"];
        d.annee = +d["annee"];
        d.csp_clean = d["Catégorie socioprofessionnelle"].replace(/^\d+\s*-\s*/, "");
    });

    // --- 2. CONFIGURATION DU CADRE ---
    const margin = { top: 40, right: 320, bottom: 60, left: 70 };
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#graph-scatter")
        .html("") 
        .append("svg")
        .attr("width", "100%")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- 3. ÉCHELLES ---
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.age_depart)).nice()
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.retraites61)).nice()
        .range([height, 0]);

    const r = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.duree_sans_emploi))
        .range([5, 22]);

    const categories = [...new Set(data.map(d => d.csp_clean))];
    const color = d3.scaleOrdinal().domain(categories).range(d3.schemeTableau10);

    // --- 4. AXES ---
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", width / 2)
        .attr("y", 45)
        .attr("fill", "#2d3a4b")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Âge moyen de départ");

    svg.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("fill", "#2d3a4b")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Proportion retraités à 61 ans (%)");

    // --- 5. LIGNES DE QUADRANTS ---
    const meanAge = d3.mean(data, d => d.age_depart);
    const meanRet = d3.mean(data, d => d.retraites61);

    svg.append("line").attr("x1", x(meanAge)).attr("y1", 0).attr("x2", x(meanAge)).attr("y2", height)
        .attr("stroke", "#ccc").attr("stroke-dasharray", "4");

    svg.append("line").attr("x1", 0).attr("y1", y(meanRet)).attr("x2", width).attr("y2", y(meanRet))
        .attr("stroke", "#ccc").attr("stroke-dasharray", "4");

    // --- 6. MENU DÉROULANT ---
    const menuDiv = d3.select("#graph-scatter").insert("div", "svg").style("margin-bottom", "20px");
    menuDiv.append("label").text("Filtrer par année : ").style("margin-right", "10px");

    const select = menuDiv.append("select")
        .style("padding", "5px 15px").style("border-radius", "20px")
        .on("change", function() { update(this.value); });

    select.selectAll("option")
        .data(["Toutes", ...new Set(data.map(d => d.annee))])
        .enter().append("option").text(d => d).attr("value", d => d);

    // --- 7. UPDATE (Avec Info-bulle multi-lignes) ---
    function update(selectedYear) {
        svg.selectAll(".info-group").remove();
        const filtered = selectedYear === "Toutes" ? data : data.filter(d => d.annee == selectedYear);

        const circles = svg.selectAll("circle.dot")
            .data(filtered, d => d.csp_clean + d.annee);

        circles.join(
            enter => enter.append("circle")
                .attr("class", "dot")
                .attr("cx", d => x(d.age_depart))
                .attr("cy", d => y(d.retraites61))
                .attr("r", 0)
                .attr("fill", d => color(d.csp_clean))
                .attr("opacity", 0.6)
                .attr("stroke", "#fff")
                .style("cursor", "pointer")
                .on("click", function(event, d) {
                    event.stopPropagation();
                    svg.selectAll(".info-group").remove();

                    svg.selectAll("circle.dot").attr("opacity", 0.3);
                    d3.select(this).attr("stroke", "#000").attr("stroke-width", 2).attr("opacity", 1).raise();

                    // Gestion texte multi-lignes
                    const [line1, line2] = splitText(d.csp_clean, 28);
                    const hasTwoLines = line2 !== "";
                    const boxWidth = 220;
                    const boxHeight = hasTwoLines ? 105 : 90;

                    let infoX = x(d.age_depart) + 15;
                    let infoY = y(d.retraites61) - boxHeight / 2;
                    if (infoX + boxWidth > width) infoX = x(d.age_depart) - boxWidth - 15;
                    if (infoY < 0) infoY = 10;
                    if (infoY + boxHeight > height) infoY = height - boxHeight - 10;

                    const infoGroup = svg.append("g")
                        .attr("class", "info-group")
                        .attr("transform", `translate(${infoX}, ${infoY})`)
                        .style("pointer-events", "none");

                    infoGroup.append("rect")
                        .attr("width", boxWidth).attr("height", boxHeight)
                        .attr("fill", "rgba(255,255,255,0.98)").attr("stroke", color(d.csp_clean))
                        .attr("stroke-width", 2).attr("rx", 5);

                    const text = infoGroup.append("text")
                        .attr("x", 10).attr("y", 20).attr("font-size", "11px").attr("fill", "#333");

                    // Titre Ligne 1
                    text.append("tspan").attr("x", 10).style("font-weight", "bold")
                        .text(`${line1}${hasTwoLines ? "" : " (" + d.annee + ")"}`);
                    
                    // Titre Ligne 2 (optionnelle)
                    if (hasTwoLines) {
                        text.append("tspan").attr("x", 10).attr("dy", "1.2em").style("font-weight", "bold")
                            .text(`${line2} (${d.annee})`);
                    }

                    text.append("tspan").attr("x", 10).attr("dy", "1.6em").text(`• Âge départ : ${d.age_depart} ans`);
                    text.append("tspan").attr("x", 10).attr("dy", "1.2em").text(`• Retraités à 61 ans : ${d.retraites61}%`);
                    text.append("tspan").attr("x", 10).attr("dy", "1.2em").text(`• Sans emploi : ${d.duree_sans_emploi} ans`);
                })
                .transition().duration(800)
                .attr("r", d => r(d.duree_sans_emploi)),
            
            update => update.transition().duration(800)
                .attr("cx", d => x(d.age_depart)).attr("cy", d => y(d.retraites61))
                .attr("r", d => r(d.duree_sans_emploi)),

            exit => exit.transition().duration(500).attr("r", 0).remove()
        );

        updateTop3(filtered);
    }

    // --- 8. LÉGENDE (Multi-lignes) ---
    const legend = svg.append("g").attr("transform", `translate(${width + 35}, 10)`);
    categories.forEach((cat, i) => {
        // Augmentation de l'espacement vertical (38px) pour les doubles lignes
        const row = legend.append("g").attr("transform", `translate(0, ${i * 38})`);
        row.append("circle").attr("r", 6).attr("fill", color(cat));
        
        const [l1, l2] = splitText(cat, 25);
        const textElement = row.append("text")
            .attr("x", 18).attr("y", 4)
            .style("font-size", "10px").style("fill", "#2d3a4b");

        textElement.append("tspan").attr("x", 18).text(l1);
        if (l2) {
            textElement.append("tspan").attr("x", 18).attr("dy", "1.2em").text(l2);
        }
    });

    // --- 9. TOP 3 ---
    function updateTop3(filtered) {
        const top3 = [...filtered].sort((a, b) => b.duree_sans_emploi - a.duree_sans_emploi).slice(0, 3);
        d3.select("#top3").html(`
            <h4 style="margin-bottom:10px; color:#4a90e2; font-size:1rem;">Top 3 - Durée sans emploi (Précarité)</h4>
            ${top3.map(d => `<div style="font-size:0.85rem; margin-bottom:5px;">
                <strong>${d.csp_clean}</strong> (${d.annee}) : <span style="color:#e63946; font-weight:bold;">${d.duree_sans_emploi} ans</span>
            </div>`).join("")}
         `);
    }

    // --- 10. GESTION DE LA FERMETURE ---
    svg.insert("rect", ":first-child")
        .attr("width", width).attr("height", height).attr("fill", "transparent")
        .on("click", () => {
            svg.selectAll(".info-group").remove();
            svg.selectAll("circle.dot").transition().duration(200).attr("stroke", "#fff").attr("stroke-width", 1).attr("opacity", 0.6);
        });

    d3.select("#graph-scatter svg").on("click", function(event) {
        if (event.target.tagName === "svg") {
            svg.selectAll(".info-group").remove();
            svg.selectAll("circle.dot").transition().duration(200).attr("stroke", "#fff").attr("stroke-width", 1).attr("opacity", 0.6);
        }
    });

    update("Toutes");
});