// Convert a validated saved Curator project to the existing server-authoritative FPS field.
// Standard team spawns at z=+/-23 and their approaches remain unobstructed.
export function curatorField(project){
 if(!project||!Array.isArray(project.objects)||project.objects.length>64)throw Error('Invalid saved map.');
 const cover=[];
 for(const o of project.objects){
  if(!Number.isInteger(o.x)||!Number.isInteger(o.z)||Math.abs(o.x)>8||Math.abs(o.z)>8)throw Error('Invalid saved cell.');
  const shape={block:{w:2,d:2,h:1.8},wall:{w:0.65,d:2.1,h:2.7},tree:{w:1.2,d:1.2,h:2.2},ramp:{w:2,d:2,h:0.85}}[o.type];
  if(shape)cover.push({x:o.x*2.3,z:o.z*2.3,...shape});
 }
 return {id:'curator-arena',name:'Curator Arena',half:28,cover,curator:true};
}
