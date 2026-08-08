// Reference data for county/sub-county cascading selection.
// This covers a representative set of counties for local development.
// Extend this to all 47 counties before production launch — structure
// stays the same, this file is the single place to update.
export const COUNTIES: Record<string, string[]> = {
  Kiambu: ['Ruiru', 'Thika Town', 'Kikuyu', 'Limuru', 'Juja'],
  Nakuru: ['Naivasha', 'Molo', 'Njoro', 'Gilgil', 'Nakuru Town East'],
  'Uasin Gishu': ['Turbo', 'Kesses', 'Soy', 'Moiben'],
  Kisumu: ['Nyando', 'Muhoroni', 'Kisumu Central', 'Seme'],
  Machakos: ['Athi River', 'Kangundo', 'Matungulu', 'Machakos Town'],
  Meru: ['Imenti North', 'Imenti South', 'Tigania East', 'Buuri'],
  Nyeri: ['Mathira', 'Tetu', 'Kieni', 'Nyeri Town'],
  Kakamega: ['Lurambi', 'Mumias East', 'Butere', 'Navakholo'],
  Bungoma: ['Kanduyi', 'Webuye East', 'Kimilili'],
  'Trans Nzoia': ['Kitale', 'Endebess', 'Saboti'],
  Kilifi: ['Kilifi North', 'Malindi', 'Kaloleni'],
  Mombasa: ['Nyali', 'Kisauni', 'Likoni', 'Changamwe'],
};
