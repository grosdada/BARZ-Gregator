/* Dimensions de travail indicatives : elles ne constituent pas des fiches constructeur. */
(function (root) {
  const catalogue = [];
  function group(category, section, rows, axis = 'height') {
    for (const [name, width, height, shape, variant = 0] of rows) catalogue.push({ id: `${category}-${catalogue.length + 1}`, name, category, section, width, height, size: axis === 'width' ? width : height, axis, aspect: width / height, shape, variant });
  }
  group('human', 'Personnages', [
    ['Homme mince', .42, 1.8, 'man', 0], ['Homme moyen', .52, 1.8, 'man', 1], ['Homme corpulent', .72, 1.8, 'man', 2],
    ['Femme mince', .4, 1.68, 'woman', 0], ['Femme moyenne', .48, 1.68, 'woman', 1], ['Femme corpulente', .65, 1.68, 'woman', 2]
  ]);
  group('animal', 'Animaux', [
    ['Chien', 1, .7, 'dog'], ['Chat', .65, .35, 'cat'], ['Gorille', .95, 1.75, 'gorilla'], ['Éléphant', 6.5, 3.3, 'elephant'], ['Girafe', 3.5, 5.5, 'giraffe'],
    ['Lion', 2.4, 1.2, 'lion'], ['Tigre', 2.8, 1.1, 'tiger'], ['Ours brun', 2.4, 1.5, 'bear'], ['Loup', 1.4, .85, 'wolf'], ['Renard', 1, .4, 'fox'],
    ['Cheval', 2.5, 1.8, 'horse'], ['Âne', 1.8, 1.5, 'donkey'], ['Vache', 2.5, 1.5, 'cow'], ['Mouton', 1.2, .85, 'sheep'], ['Chèvre', 1.2, 1, 'goat'],
    ['Cochon', 1.6, .85, 'pig'], ['Cerf', 2, 2.1, 'deer'], ['Rhinocéros', 3.7, 1.8, 'rhino'], ['Hippopotame', 3.5, 1.5, 'hippo'], ['Zèbre', 2.4, 1.6, 'zebra'],
    ['Lapin', .45, .4, 'rabbit'], ['Kangourou', 1.65, 1.8, 'kangaroo'], ['Panda', 1.6, .9, 'panda'], ['Crocodile', 4.5, .55, 'crocodile'], ['Tortue', .7, .35, 'turtle'],
    ['Aigle', .9, .7, 'eagle'], ['Autruche', 1.5, 2.5, 'ostrich'], ['Manchot', .5, 1.1, 'penguin'], ['Dauphin', 2.5, .75, 'dolphin'], ['Baleine bleue', 25, 5, 'whale']
  ]);
  group('vehicle', 'Voitures & utilitaires', [
    ['Citadine', 3.6, 1.5, 'car', 0], ['Compacte', 4.25, 1.45, 'car', 1], ['Berline', 4.8, 1.45, 'car', 2], ['Break', 4.8, 1.5, 'car', 3],
    ['Coupé sportif', 4.5, 1.25, 'car', 4], ['Cabriolet', 4.3, 1.3, 'car', 5], ['SUV', 4.7, 1.8, 'car', 6], ['4 × 4', 4.6, 1.95, 'car', 7],
    ['Pick-up', 5.4, 1.85, 'car', 8], ['Fourgon', 5.4, 2.5, 'van', 0], ['Camping-car', 7, 3.1, 'van', 1], ['Limousine', 8.5, 1.5, 'car', 9]
  ], 'width');
  group('vehicle', 'Motos & cycles', [
    ['Moto de ville', 2.1, 1.15, 'motorbike', 0], ['Moto sportive', 2.05, 1.1, 'motorbike', 1], ['Moto custom', 2.5, 1.2, 'motorbike', 2],
    ['Moto tout-terrain', 2.2, 1.3, 'motorbike', 3], ['Scooter', 1.8, 1.15, 'motorbike', 4], ['Quad', 2, 1.2, 'quad'],
    ['Vélo de ville', 1.8, 1.1, 'bicycle', 0], ['VTT', 1.85, 1.15, 'bicycle', 1], ['Vélo de course', 1.75, 1, 'bicycle', 2], ['Vélo cargo', 2.6, 1.2, 'bicycle', 3]
  ], 'width');
  group('vehicle', 'Bateaux', [
    ['Barque', 4, .8, 'boat', 0], ['Zodiac', 5, 1.2, 'boat', 1], ['Voilier', 12, 17, 'sailboat', 0], ['Catamaran', 14, 20, 'sailboat', 1],
    ['Vedette', 10, 3.5, 'boat', 2], ['Yacht', 45, 13, 'ship', 0], ['Ferry', 150, 30, 'ship', 1], ['Paquebot', 300, 65, 'ship', 2],
    ['Porte-conteneurs', 300, 55, 'ship', 3], ['Pétrolier', 330, 45, 'ship', 4]
  ], 'width');
  group('vehicle', 'Avions & hélicoptères', [
    ['Avion léger', 8.3, 2.7, 'plane', 0], ['Avion de tourisme', 11, 3.4, 'plane', 1], ['Jet privé', 22, 6.5, 'plane', 2],
    ['Avion régional', 32, 9.8, 'plane', 3], ['Avion de ligne', 39.5, 12, 'plane', 4], ['Gros-porteur', 73, 24, 'plane', 5],
    ['Avion cargo', 69, 21, 'plane', 6], ['Avion de chasse', 19, 5.1, 'plane', 7], ['Hélicoptère léger', 11, 3.3, 'helicopter', 0], ['Hélicoptère de transport', 20, 5.3, 'helicopter', 1]
  ], 'width');
  group('vehicle', 'Transports & engins', [
    ['Bus urbain', 12, 3.2, 'bus', 0], ['Autocar', 13, 3.7, 'bus', 1], ['Bus à impériale', 11, 4.4, 'bus', 2],
    ['Tramway', 32, 3.6, 'train', 0], ['Locomotive', 19, 4.3, 'train', 1], ['Train à grande vitesse', 200, 4.3, 'train', 2],
    ['Semi-remorque', 16.5, 4, 'truck'], ['Pelleteuse', 8, 3.2, 'excavator']
  ], 'width');
  group('building', 'Maisons & habitat', [
    ['Petite maison', 8, 6, 'house', 0], ['Maison à étage', 10, 9, 'house', 1], ['Villa', 18, 8, 'house', 2], ['Chalet', 10, 8, 'house', 3],
    ['Pavillon', 12, 7, 'house', 4], ['Maison de ville', 6, 12, 'house', 5], ['Manoir', 25, 15, 'house', 6], ['Ferme', 25, 9, 'house', 7]
  ]);
  group('building', 'Immeubles & tours', [
    ['Immeuble · 3 étages', 15, 12, 'building', 3], ['Immeuble · 5 étages', 20, 18, 'building', 5], ['Immeuble · 8 étages', 25, 27, 'building', 8],
    ['Tour résidentielle', 30, 60, 'building', 15], ['Tour de bureaux', 35, 100, 'building', 22], ['Gratte-ciel', 45, 200, 'skyscraper', 0],
    ['Tour élancée', 30, 300, 'skyscraper', 1], ['Tour jumelle', 80, 180, 'skyscraper', 2], ['Tour à gradins', 70, 250, 'skyscraper', 3],
    ['Tour vitrée', 45, 150, 'skyscraper', 4], ['Tour cylindrique', 40, 120, 'skyscraper', 5], ['Mégatour', 100, 600, 'skyscraper', 6]
  ]);
  group('building', 'Industrie & équipements', [
    ['Usine', 80, 25, 'factory', 0], ['Entrepôt', 60, 12, 'warehouse', 0], ['Hangar', 70, 20, 'warehouse', 1], ['Centrale', 100, 100, 'factory', 1],
    ['Silo à grain', 30, 40, 'silo', 0], ['Château d’eau', 20, 45, 'silo', 1], ['Cheminée industrielle', 12, 120, 'chimney'], ['Raffinerie', 120, 55, 'factory', 2]
  ]);
  group('building', 'Patrimoine & monuments', [
    ['Château fort', 65, 35, 'castle', 0], ['Palais', 120, 30, 'palace', 0], ['Cathédrale', 60, 90, 'cathedral'], ['Église', 25, 35, 'church'],
    ['Mosquée', 60, 55, 'mosque'], ['Temple', 35, 18, 'temple'], ['Pagode', 25, 50, 'pagoda'], ['Phare', 12, 40, 'lighthouse'],
    ['Tour Eiffel', 125, 330, 'eiffel'], ['Arc de triomphe', 45, 50, 'arch'], ['Pyramide', 230, 147, 'pyramid'], ['Obélisque', 5, 23, 'obelisk']
  ]);
  group('building', 'Infrastructures', [
    ['Stade', 250, 50, 'stadium'], ['Gare', 100, 25, 'station'], ['Aéroport', 250, 40, 'airport'], ['Hôpital', 80, 35, 'hospital'],
    ['École', 60, 15, 'school'], ['Centre commercial', 150, 20, 'mall'], ['Pont suspendu', 1200, 200, 'bridge'], ['Viaduc', 500, 80, 'viaduct'],
    ['Éolienne', 130, 200, 'windmill'], ['Antenne', 30, 150, 'antenna']
  ]);
  root.CATALOGUE = catalogue;
  root.CATEGORIES = [{ id: 'human', name: 'Personnages', icon: 'person' }, { id: 'animal', name: 'Animaux', icon: 'paw' }, { id: 'vehicle', name: 'Véhicules', icon: 'car' }, { id: 'building', name: 'Bâtiments', icon: 'building' }];
  if (typeof module !== 'undefined') module.exports = catalogue;
})(typeof globalThis !== 'undefined' ? globalThis : this);
