// TACHE 2 : ANALYSE DES PROFILS CSP (Nuage de points)

// Fonction utilitaire pour couper le texte en deux lignes proprement
function splitText(text, maxLength = 25) {
    if (text.length <= maxLength) return [text, ""]; //si le texte est court, on ne le coupe pas, retourne un tableau de 2 éléments
    let index = text.lastIndexOf(" ", maxLength); //le dernier espace AVANT la position maxLength, Pour éviter de couper un mot en plein milieu.
    if (index === -1) index = maxLength; //Si aucun espace trouvé, on coupe à maxLength.
    // On retourne ["Première ligne", "Deuxième ligne"]
    return [text.substring(0, index), text.substring(index).trim()]; // trim():enlève les espaces au début/fin
}
//Chargement des données
// On utilise d3.dsv() pour charger un fichier CSV, en spécifiant le séparateur ";" et data = tableau d’objets
d3.dsv(";", "departretraite_parcsp.csv").then((data) => {

    // 1. NETTOYAGE DES DONNÉES
    //On boucle sur chaque ligne .d = une ligne.
    data.forEach(d => {
        // On remplace les "," par des "." pour les nombres, + devant : convertit en nombre
        d.age_depart = +d["Âge conjoncturel de départ à la retraite"].replace(",", ".");
        d.retraites61 = +d["Proportion de retraités à 61 ans"];
        d.duree_sans_emploi = +d["Durée moyenne sans emploi ni retraite"];
        d.annee = +d["annee"];
        // On remplace les "Catégorie socioprofessionnelle" par "csp_clean"
        // REGEX
        d.csp_clean = d["Catégorie socioprofessionnelle"].replace(/^\d+\s*-\s*/, "");
    });

    // 2. CONFIGURATION DU CADRE 
    // On définit les dimensions du graphique et la marge
    //On réserve de l’espace pour axes + légende.
    const margin = { top: 40, right: 320, bottom: 60, left: 70 };
    //le vrai espace dessinable = largeur totale - marges
    const width = 1000 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // CREATION DU GRAPHIQUE SVG
    // On sélectionne l'élément HTML (sélection DOM) qui accueillera le graphique (id HTML)
    const svg = d3.select("#graph-scatter")
        .html("") // On efface le contenu de l'élément HTML
        .append("svg")// On ajoute un élément SVG
        .attr("width", "100%") // On définit la largeur
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`) // On définit la vue, ${} permet d’insérer des variables, Le viewBox rend le SVG responsive
        .append("g") // On ajoute un élément g pour regrouper les éléments du graphique
        .attr("transform", `translate(${margin.left},${margin.top})`); // On définit la translation du groupe pour décaler le graphique de la taille des marges

    // 3. ÉCHELLES 
    const x = d3.scaleLinear() // On définit une échelle linéaire
        .domain(d3.extent(data, d => d.age_depart)).nice() // On définit la plage de valeurs de l'échelle en utilisant la fonction extent() qui renvoie les valeurs min et max d'un tableau. On utilise la fonction nice() pour arrondir les valeurs
        .range([0, width]); // On définit la plage de valeurs de l'échelle en pixels

    const y = d3.scaleLinear() // On définit une échelle linéaire
        .domain(d3.extent(data, d => d.retraites61)).nice() // On définit la plage de valeurs de l'échelle en utilisant la fonction extent() qui renvoie les valeurs min et max d'un tableau. On utilise la fonction nice() pour arrondir les valeurs
        .range([height, 0]); // On définit la plage de valeurs de l'échelle en pixels

    const r = d3.scaleSqrt() // On définit une échelle racine carrée (surface des cercles augmente proportionnellement)
        .domain(d3.extent(data, d => d.duree_sans_emploi)) // On définit la plage de valeurs de l'échelle en utilisant la fonction extent() qui renvoie les valeurs min et max d'un tableau
        .range([5, 22]); // On définit la plage de valeurs de l'échelle en pixels
    // data.map() → extrait toutes les CSP, data.map() → extrait toutes les CSP, new Set() → supprime doublons, [...new Set()] → transforme Set en Array
    const categories = [...new Set(data.map(d => d.csp_clean))]; // On crée un tableau avec les valeurs uniques de la colonne "csp_clean"
    const color = d3.scaleOrdinal().domain(categories).range(d3.schemeTableau10); // On définit une échelle de couleur avec les valeurs uniques de la colonne "csp_clean" et les couleurs du jeu de couleurs "Tableau"

    // 4. AXES 
    svg.append("g") // On ajoute un groupe pour l'axe des ordonnées
        .attr("transform", `translate(0,${height})`) // On déplace le groupe vers le bas pour qu'il soit placé en bas du graphique
        .call(d3.axisBottom(x)) // On appelle la fonction axisBottom() pour créer l'axe des ordonnées
        .append("text") // On ajoute un texte pour le titre de l'axe des ordonnées
        .attr("x", width / 2) // On centre le texte sur l'axe des ordonnées
        .attr("y", 45) // On déplace le texte vers le bas pour qu'il soit placé sous l'axe des ordonnées
        .attr("fill", "#2d3a4b") // On définit la couleur du texte
        .style("text-anchor", "middle") // On centre le texte
        .style("font-weight", "bold") // On met le texte en gras
        .text("Âge moyen de départ"); // On définit le texte du titre de l'axe des ordonnées

    svg.append("g") // On ajoute un groupe pour l'axe des abscisses
        .call(d3.axisLeft(y)) // On appelle la fonction axisLeft() pour créer l'axe des abscisses
        .append("text") // On ajoute un texte pour le titre de l'axe des abscisses
        .attr("transform", "rotate(-90)") // On fait pivoter le texte de 90 degrés pour qu'il soit placé à côté de l'axe des abscisses
        .attr("x", -height / 2) // On centre le texte sur l'axe des abscisses
        .attr("y", -50) // On déplace le texte vers la droite pour qu'il soit placé à côté de l'axe des abscisses
        .attr("fill", "#2d3a4b") // On définit la couleur du texte
        .style("text-anchor", "middle") // On centre le texte
        .style("font-weight", "bold") // On met le texte en gras
        .text("Proportion retraités à 61 ans (%)"); // On définit le texte du titre de l'axe des abscisses

    // 5. LIGNES DE QUADRANTS 
    const meanAge = d3.mean(data, d => d.age_depart); // On calcule la moyenne de la variable age_depart
    const meanRet = d3.mean(data, d => d.retraites61); // On calcule la moyenne de la variable retraites61

    svg.append("line").attr("x1", x(meanAge)).attr("y1", 0).attr("x2", x(meanAge)).attr("y2", height)
        .attr("stroke", "#ccc").attr("stroke-dasharray", "4"); // On trace une ligne horizontale pour le quadrillage

    svg.append("line").attr("x1", 0).attr("y1", y(meanRet)).attr("x2", width).attr("y2", y(meanRet))
        .attr("stroke", "#ccc").attr("stroke-dasharray", "4"); // On trace une ligne verticale pour le quadrillage

    // 6. MENU DÉROULANT 
    const menuDiv = d3.select("#graph-scatter").insert("div", "svg").style("margin-bottom", "20px"); // On crée un div pour le menu déroulant
    menuDiv.append("label").text("Filtrer par année : ").style("margin-right", "10px"); // On ajoute un label pour le menu déroulant

    const select = menuDiv.append("select") // On ajoute un select pour le menu déroulant
        .style("padding", "5px 15px").style("border-radius", "20px") // On ajoute du style au select
        .on("change", function() { update(this.value); }); // On ajoute un event listener pour le select

    select.selectAll("option") // On ajoute les options au select
        .data(["Toutes", ...new Set(data.map(d => d.annee))]) // On crée un tableau avec les années uniques
        .enter().append("option").text(d => d).attr("value", d => d); // On ajoute les options au select

    // 7. UPDATE (Avec Info-bulle multi-lignes) et Quadrillage
    function update(selectedYear, subset = null) {
        svg.selectAll(".info-group").remove();
        const filtered = subset ? subset : (selectedYear === "Toutes" ? data : data.filter(d => d.annee == selectedYear));

        const circles = svg.selectAll("circle.dot")
            .data(filtered, d => d.csp_clean + d.annee);

        circles.join( // On met à jour les cercles
            enter => enter.append("circle") // On ajoute les cercles qui n'existent pas encore
                .attr("class", "dot") // On ajoute la classe "dot" pour pouvoir les sélectionner plus tard
                .attr("cx", d => x(d.age_depart)) // On définit l'abscisse du cercle en fonction de l'âge de départ
                .attr("cy", d => y(d.retraites61)) // On définit l'ordonnée du cercle en fonction du nombre de retraités
                .attr("r", 0) // On définit le rayon du cercle à 0 pour l'animer
                .attr("fill", d => color(d.csp_clean)) // On définit la couleur du cercle en fonction de la CSP
                .attr("opacity", 0.6) // On définit l'opacité du cercle à 0.6
                .attr("stroke", "#fff") // On définit la couleur du contour du cercle à blanc
                .style("cursor", "pointer") // On définit le curseur de la souris à pointer
                .on("click", function(event, d) { // On définit l'événement de clic sur les cercles
                    event.stopPropagation(); // On empêche la propagation de l'événement pour ne pas déclencher l'événement de clic sur le svg
                    svg.selectAll(".info-group").remove(); // On supprime les groupes d'informations existants

                    svg.selectAll("circle.dot").attr("opacity", 0.3); // On réduit l'opacité de tous les cercles à 0.3
                    d3.select(this).attr("stroke", "#000").attr("stroke-width", 2).attr("opacity", 1).raise(); // On augmente l'opacité du cercle sélectionné à 1 et on le met au premier plan

                    // Gestion texte multi-lignes
                    const [line1, line2] = splitText(d.csp_clean, 28); // On divise le texte en deux lignes si nécessaire
                    const hasTwoLines = line2 !== ""; // On vérifie si le texte est divisé en deux lignes
                    const boxWidth = 220; // On définit la largeur de la boîte d'information
                    const boxHeight = hasTwoLines ? 105 : 90; // On définit la hauteur de la boîte d'information en fonction du nombre de lignes

                    let infoX = x(d.age_depart) + 15; // On définit la position horizontale de la boîte d'information
                    let infoY = y(d.retraites61) - boxHeight / 2; // On définit la position verticale de la boîte d'information
                    if (infoX + boxWidth > width) infoX = x(d.age_depart) - boxWidth - 15; // On ajuste la position horizontale si la boîte dépasse la largeur du graphique
                    if (infoY < 0) infoY = 10; // On ajuste la position verticale si la boîte dépasse le haut du graphique
                    if (infoY + boxHeight > height) infoY = height - boxHeight - 10; // On ajuste la position verticale si la boîte dépasse le bas du graphique

                    const infoGroup = svg.append("g") // On crée un groupe pour contenir la boîte d'information
                        .attr("class", "info-group") // On ajoute une classe pour pouvoir la styliser
                        .attr("transform", `translate(${infoX}, ${infoY})`) // On positionne le groupe à la position calculée
                        .style("pointer-events", "none"); // On empêche les événements de souris de passer à travers la boîte d'information

                    infoGroup.append("rect") // On ajoute un rectangle pour la boîte d'information
                        .attr("width", boxWidth).attr("height", boxHeight) // On définit la largeur et la hauteur de la boîte
                        .attr("fill", "rgba(255,255,255,0.98)").attr("stroke", color(d.csp_clean)) // On définit la couleur de fond et de contour de la boîte
                        .attr("stroke-width", 2).attr("rx", 5); // On définit l'épaisseur du contour et les coins arrondis

                    const text = infoGroup.append("text") // On ajoute un élément de texte pour afficher les informations
                        .attr("x", 10).attr("y", 20).attr("font-size", "11px").attr("fill", "#333"); // On définit la position, la taille et la couleur du texte

                    // Titre Ligne 1
                    text.append("tspan").attr("x", 10).style("font-weight", "bold") // On définit le style du texte pour le titre
                        .text(`${line1}${hasTwoLines ? "" : " (" + d.annee + ")"}`); // On ajoute le titre à l'élément de texte
                    
                    // Titre Ligne 2 si nécessaire
                    if (hasTwoLines) { // Si le titre fait plus de 30 caractères, on le divise en deux lignes
                        text.append("tspan").attr("x", 10).attr("dy", "1.2em").style("font-weight", "bold") // On définit le style du texte pour le titre de la deuxième ligne
                            .text(`${line2} (${d.annee})`); // On ajoute le titre de la deuxième ligne à l'élément de texte
                    }

                    text.append("tspan").attr("x", 10).attr("dy", "1.6em").text(`• Âge départ : ${d.age_depart} ans`); // On ajoute le texte à l'élément de texte
                    text.append("tspan").attr("x", 10).attr("dy", "1.2em").text(`• Retraités à 61 ans : ${d.retraites61}%`); // On ajoute le texte à l'élément de texte
                    text.append("tspan").attr("x", 10).attr("dy", "1.2em").text(`• Sans emploi : ${d.duree_sans_emploi} ans`); // On ajoute le texte à l'élément de texte
                })
                .transition().duration(800) // On ajoute une transition pour l'animation
                .attr("r", d => r(d.duree_sans_emploi)), // On définit la taille des cercles en fonction de la durée sans emploi
            
            update => update.transition().duration(800) // On ajoute une transition pour l'animation
                .attr("cx", d => x(d.age_depart)).attr("cy", d => y(d.retraites61)) // On définit les positions des cercles en fonction de l'âge de départ et du pourcentage de retraités à 61 ans
                .attr("r", d => r(d.duree_sans_emploi)), // On définit la taille des cercles en fonction de la durée sans emploi

            exit => exit.transition().duration(500).attr("r", 0).remove() // On définit l'animation de sortie des cercles
            
        );

        updateTop3(filtered); // On met à jour le top 3
        updateAnalyse(filtered, selectedYear); // On met à jour l'analyse
    }

    // === LÉGENDE INTERACTIVE (Multi-lignes + clic pour filtrer) ===

// Position du bouton “Tout afficher”
const legendX = width + 35;
const legendY = 10;

// Créer un groupe pour la légende entière
const legendGroup = svg.append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);

// Bouton "Tout afficher"
const allBtn = legendGroup.append("g")
    .attr("class", "legend-btn")
    .style("cursor", "pointer")
    .on("click", () => update("Toutes")); // remet toutes les catégories

// Rectangle du bouton
allBtn.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 80)
    .attr("height", 20)
    .attr("rx", 5)
    .attr("fill", "#f0f0f0")
    .attr("stroke", "#999");

// Texte du bouton
allBtn.append("text")
    .attr("x", 40)
    .attr("y", 14)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#333")
    .text("Tout afficher");

// 2️⃣ Catégories
const categoriesYStart = 30; // espace entre le bouton et la première catégorie
categories.forEach((cat, i) => {
    const row = legendGroup.append("g")
        .attr("transform", `translate(0, ${categoriesYStart + i * 45})`) // 45 = hauteur d'une ligne (avec multi-lignes)
        .style("cursor", "pointer")
        .on("click", () => {
            const filtered = data.filter(d => d.csp_clean === cat);
            update("Toutes", filtered);
        });

    row.append("circle")
        .attr("r", 6)
        .attr("fill", color(cat));

    const [l1, l2] = splitText(cat, 18);
    const textElement = row.append("text")
        .attr("x", 18)
        .attr("y", 4)
        .style("font-size", "10px")
        .style("fill", "#2d3a4b");

    textElement.append("tspan").attr("x", 18).attr("dy", "0em").text(l1);
    if (l2) textElement.append("tspan").attr("x", 18).attr("dy", "1.2em").text(l2);
});

    // 9. TOP 3 
    function updateTop3(filtered) { // fonction pour mettre à jour le top 3
        const top3 = [...filtered].sort((a, b) => b.duree_sans_emploi - a.duree_sans_emploi).slice(0, 3); // On trie les données par ordre décroissant de durée sans emploi et on prend les 3 premières
        d3.select("#top3").html(`
            <h4 style="margin-bottom:10px; color:#4a90e2; font-size:1rem;">Top 3 - Durée sans emploi (Précarité)</h4> 
            ${top3.map(d => `<div style="font-size:0.85rem; margin-bottom:5px;">
                <strong>${d.csp_clean}</strong> (${d.annee}) : <span style="color:#e63946; font-weight:bold;">${d.duree_sans_emploi} ans</span>
            </div>`).join("")} 
         `); // On met à jour le contenu HTML avec les données du top 3
    }

    // 10. GESTION DE LA FERMETURE 
    svg.insert("rect", ":first-child") // On insère un rectangle en premier enfant de l'élément SVG
        .attr("width", width).attr("height", height).attr("fill", "transparent") // On définit les attributs du rectangle
        .on("click", () => { // On définit un gestionnaire d'événement pour le clic sur le rectangle
            svg.selectAll(".info-group").remove(); // On supprime les éléments de la classe "info-group"
            svg.selectAll("circle.dot").transition().duration(200).attr("stroke", "#fff").attr("stroke-width", 1).attr("opacity", 0.6); // On remet les cercles à leur état initial
        });

    d3.select("#graph-scatter svg").on("click", function(event) { // On définit un gestionnaire d'événement pour le clic sur le SVG
        if (event.target.tagName === "svg") { // Si l'élément cliqué est le SVG lui-même
            svg.selectAll(".info-group").remove(); // On supprime les éléments de la classe "info-group"
            svg.selectAll("circle.dot").transition().duration(200).attr("stroke", "#fff").attr("stroke-width", 1).attr("opacity", 0.6); // On remet les cercles à leur état initial
        }
    });

    update("Toutes"); // On appelle la fonction update avec le paramètre "Toutes" pour afficher tous les cercles
   
    
    function updateAnalyse(filtered, selectedYear) { // Fonction pour mettre à jour l'analyse en fonction des filtres
    const content = d3.select("#analyse-content");
    
    // On définit les messages selon l'année ou la vue globale
    let synthese = "";
    
    if (selectedYear === "Toutes") {
        synthese = `
            <p>Sur la période <strong>2013-2020</strong>, on observe une corrélation nette : 
            les catégories ayant l'âge de départ le plus bas sont aussi celles qui ont le plus fort taux de retraités à 61 ans.</p>
            
            <ul style="padding-left:20px;">
                <li><strong>Quadrant Haut-Gauche :</strong> Profils type <em>Ouvriers/Employés</em>. Carrières souvent commencées tôt, permettant un départ précoce mais avec une forte exposition au chômage en fin de carrière (grosses bulles).</li>
                <li><strong>Quadrant Bas-Droite :</strong> Profils type <em>Cadres/Professions Libérales</em>. Départs plus tardifs avec une transition plus directe vers la retraite.</li>
                <li><strong>Cas particulier :</strong> Les <em>Agriculteurs</em> restent isolés avec l'âge de départ le plus élevé du dataset.</li>
            </ul>
        `;
    } else {
        synthese = `<p>En <strong>${selectedYear}</strong>, l'analyse confirme la séparation entre les métiers à forte pénibilité (départs précoces) et les professions intellectuelles ou indépendantes (départs tardifs).</p>`;
    }

    content.html(synthese);
}


});