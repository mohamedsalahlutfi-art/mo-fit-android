"""Build the original, faceless MO FIT mannequin and its three preview clips.

Run with blender --background --python tools/create_motion_model.py.
"""
import math
from pathlib import Path

import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)

def v(x, y, z):
    return Vector((x, -z, y))

def offset(point, x=0, y=0, z=0):
    return point + v(x, y, z)

def two_link(start, end, upper, lower, bend):
    axis = (end - start).normalized()
    distance = (end - start).length
    along = (upper**2 - lower**2 + distance**2) / (2 * distance)
    perpendicular = (bend - axis * bend.dot(axis)).normalized()
    return start + axis * along + perpendicular * math.sqrt(max(0, upper**2 - along**2))

def joints(kind, t):
    if kind == 'bridge':
        neck = v(0, .21, -.50)
        pitch = math.radians(-2 + 37*t)
        hip = offset(neck, y=.52*math.sin(pitch), z=.52*math.cos(pitch))
        head = offset(neck, y=-.045, z=-.16)
    elif kind == 'wall':
        angle = math.radians(7.5 + 11.5*t)
        hip = v(0, .10+.89*math.cos(angle), .89*math.sin(angle))
        neck = offset(hip, y=.52*math.cos(angle), z=.52*math.sin(angle))
        head = offset(neck, y=.16*math.cos(angle), z=.16*math.sin(angle))
    elif kind == 'squat':
        hip = v(0, .99-.48*t, -.025-.355*t)
        angle = math.radians(34*t)
        neck = offset(hip, y=.52*math.cos(angle), z=.52*math.sin(angle))
        head = offset(neck, y=.16, z=.025*t)
    else:
        hip, neck, head = v(0,.99,0), v(0,1.51,0), v(0,1.67,0)
    bones = {'torso': (hip, neck), 'head': (neck, head)}
    for side in (-1, 1):
        hip_side = offset(hip, x=side*.112)
        ankle = v(side*.131, .10, .72 if kind == 'bridge' else 0)
        knee = two_link(hip_side, ankle, .46, .46,
                        v(0, 1, 0) if kind == 'bridge' else v(0,0,1))
        toe = offset(ankle, y=-.052, z=.16)
        shoulder = offset(neck, x=side*.224, y=.01 if kind == 'bridge' else -.105)
        if kind == 'bridge':
            wrist = offset(shoulder, x=side*.107, y=-.151, z=.525)
            elbow = two_link(shoulder, wrist, .285, .273, v(0,-1,0))
            fingers = offset(wrist, y=-.018, z=.105)
        elif kind == 'wall':
            wrist = v(side*.242, 1.35, .735)
            elbow = two_link(shoulder, wrist, .285, .273, v(side*.52,-1,0))
            fingers = offset(wrist, y=.112, z=.018)
        elif kind == 'rest':
            elbow = offset(shoulder, x=side*.145, y=-.245)
            wrist = offset(elbow, x=side*.137, y=-.236)
            fingers = offset(wrist, x=side*.055, y=-.095)
        else:
            angle = math.radians(76*t)
            elbow = offset(shoulder, x=side*.039, y=-.282*math.cos(angle), z=.282*math.sin(angle))
            wrist = offset(elbow, x=side*.018, y=-.272*math.cos(angle+.08), z=.272*math.sin(angle+.08))
            fingers = offset(wrist, y=-.11*math.cos(angle), z=.11*math.sin(angle))
        for name, pair in {
            'thigh': (hip_side,knee), 'shin': (knee,ankle), 'foot': (ankle,toe),
            'upper_arm': (shoulder,elbow), 'forearm': (elbow,wrist), 'hand': (wrist,fingers),
        }.items():
            bones[f'{name}_{side}'] = pair
    return bones

rest = joints('rest', 0)
parts = []

def ellipsoid(point, radii, rotation=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=point)
    piece = bpy.context.object
    piece.scale = radii
    if rotation:
        piece.rotation_mode = 'QUATERNION'
        piece.rotation_quaternion = rotation
    parts.append(piece)

def muscle(bone, fraction, radii):
    start, end = rest[bone]
    orientation = (end - start).to_track_quat('Z', 'Y')
    ellipsoid(start.lerp(end, fraction), radii, orientation)

# Volumes overlap before voxel remeshing to produce one connected surface.
ellipsoid(v(0,1.01,-.015), (.194,.123,.155))
ellipsoid(v(0,1.19,-.008), (.157,.108,.216))
ellipsoid(v(0,1.363,.002), (.229,.127,.170))
ellipsoid(v(0,1.478,-.009), (.097,.080,.119))
ellipsoid(v(0,1.654,.008), (.095,.093,.129))
ellipsoid(v(0,1.595,.039), (.073,.081,.065))
for side in (-1, 1):
    muscle(f'upper_arm_{side}', .10, (.089,.079,.115))
    muscle(f'upper_arm_{side}', .56, (.065,.061,.176))
    muscle(f'forearm_{side}', .32, (.055,.051,.145))
    muscle(f'forearm_{side}', .72, (.041,.041,.112))
    muscle(f'hand_{side}', .49, (.046,.031,.083))
    muscle(f'thigh_{side}', .27, (.109,.106,.214))
    muscle(f'thigh_{side}', .64, (.085,.078,.214))
    muscle(f'shin_{side}', .25, (.073,.077,.172))
    muscle(f'shin_{side}', .70, (.048,.053,.152))
    ellipsoid(v(side*.131,.064,.072), (.058,.115,.061))
    ellipsoid(v(side*.131,.062,-.010), (.049,.060,.060))

bpy.ops.object.select_all(action='DESELECT')
for piece in parts:
    piece.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
mesh = bpy.context.object
mesh.name = 'MO FIT mannequin'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
mesh.data.remesh_voxel_size = .016
bpy.ops.object.voxel_remesh()
smoothing = mesh.modifiers.new('Surface smoothing', 'SMOOTH')
smoothing.factor = .8
smoothing.iterations = 8
bpy.ops.object.modifier_apply(modifier=smoothing.name)
decimation = mesh.modifiers.new('Mobile triangle budget', 'DECIMATE')
decimation.ratio = .42
bpy.ops.object.modifier_apply(modifier=decimation.name)
bpy.ops.object.shade_smooth()
mat = bpy.data.materials.new('Matte stone')
mat.diffuse_color = (.58,.70,.77,1)
mesh.data.materials.append(mat)

rig_data = bpy.data.armatures.new('Mannequin joints')
rig = bpy.data.objects.new('Motion rig', rig_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, (head, tail) in rest.items():
    bone = rig_data.edit_bones.new(name)
    bone.head, bone.tail = head, tail
bpy.ops.object.mode_set(mode='OBJECT')
groups = {name: mesh.vertex_groups.new(name=name) for name in rest}
for vertex in mesh.data.vertices:
    scores = []
    x, _, y = vertex.co
    side = 1 if x >= 0 else -1
    arm = [f'{name}_{side}' for name in ('upper_arm', 'forearm', 'hand')]
    leg = [f'{name}_{side}' for name in ('thigh', 'shin', 'foot')]
    shoulder_boundary = .20 + max(0, 1.36-y)*.46
    if abs(x) > shoulder_boundary:
        candidates = arm + (['torso'] if y > 1.31 else [])
    elif y < .91:
        candidates = leg
    else:
        candidates = ['torso']
        if y > 1.45:
            candidates.append('head')
        if y < 1.09:
            candidates.append(leg[0])
        if y > 1.30 and abs(x) > .135:
            candidates.append(arm[0])
    for name in candidates:
        head, tail = rest[name]
        axis = tail - head
        factor = max(0, min(1, (vertex.co-head).dot(axis)/axis.length_squared))
        distance = (vertex.co-head-axis*factor).length_squared
        scores.append((distance, name))
    nearest = sorted(scores)[:3]
    weights = [(name, math.exp(-(distance-nearest[0][0])/.0018))
               for distance, name in nearest]
    total = sum(weight for _, weight in weights)
    for name, weight in weights:
        groups[name].add([vertex.index], weight/total, 'REPLACE')
skin = mesh.modifiers.new('Deform with motion rig', 'ARMATURE')
skin.object = rig
mesh.parent = rig

bpy.context.scene.render.fps = 30
animation = rig.animation_data_create()
for clip in ('squat','wall','bridge'):
    action = bpy.data.actions.new(clip)
    animation.action = action
    for frame in range(1, 98, 4):
        t = (1-math.cos((frame-1)/96*math.tau))/2
        posed = joints(clip, t)
        for name, (head, tail) in posed.items():
            bone = rig.pose.bones[name]
            base, end = rest[name]
            rest_rotation = bone.bone.matrix_local.to_quaternion()
            rotation = (end-base).rotation_difference(tail-head)
            bone.location = rest_rotation.inverted() @ (head-base)
            bone.rotation_mode = 'QUATERNION'
            bone.rotation_quaternion = rest_rotation.inverted() @ rotation @ rest_rotation
            bone.keyframe_insert('location', frame=frame)
            bone.keyframe_insert('rotation_quaternion', frame=frame)
    animation.action = None
    track = animation.nla_tracks.new()
    track.name = clip
    track.strips.new(clip, 1, action)
    track.mute = True

output = Path('app/src/main/assets/motion-model.glb')
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB',
                          export_animation_mode='NLA_TRACKS',
                          export_frame_range=False, export_anim_slide_to_zero=True)
