import bpy
import math
import os

def setup_and_render_rotating_earth(
    output_dir="/home/jenningsl/Documents/儿子学习/science/rotating-earth",
    fps=24,
    duration_sec=5.0,
    res_x=1920,
    res_y=1080
):
    total_frames = int(fps * duration_sec) # 120 frames
    
    # Textures
    tex_dir = os.path.join(output_dir, "textures")
    day_tex_path = os.path.join(tex_dir, "earth_day.jpg")
    night_tex_path = os.path.join(tex_dir, "earth_night.jpg")
    normal_tex_path = os.path.join(tex_dir, "earth_normal.jpg")
    spec_tex_path = os.path.join(tex_dir, "earth_specular.jpg")
    clouds_tex_path = os.path.join(tex_dir, "earth_clouds.png")
    
    # 0. Clean Scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    
    # Render Settings
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.fps = fps
    scene.frame_start = 1
    scene.frame_end = total_frames
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    
    # Color management: AgX High Contrast
    if hasattr(scene.view_settings, 'view_transform'):
        scene.view_settings.view_transform = 'AgX'
        scene.view_settings.look = 'AgX - High Contrast'

    # 1. Deep Space World Background with Pinpoint Stars
    world = bpy.data.worlds.new("SpaceWorld")
    scene.world = world
    wnodes = world.node_tree.nodes
    wlinks = world.node_tree.links
    wnodes.clear()

    w_bg = wnodes.new('ShaderNodeBackground')
    w_bg.inputs['Color'].default_value = (0.0001, 0.00015, 0.0003, 1.0)
    w_bg.inputs['Strength'].default_value = 1.0

    w_tex = wnodes.new('ShaderNodeTexCoord')
    w_noise = wnodes.new('ShaderNodeTexNoise')
    w_noise.inputs['Scale'].default_value = 850.0
    w_noise.inputs['Detail'].default_value = 15.0

    w_ramp = wnodes.new('ShaderNodeValToRGB')
    w_ramp.color_ramp.elements[0].position = 0.88
    w_ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    w_ramp.color_ramp.elements[1].position = 0.91
    w_ramp.color_ramp.elements[1].color = (3.5, 4.0, 5.0, 1)

    w_stars_bg = wnodes.new('ShaderNodeBackground')
    w_stars_bg.inputs['Strength'].default_value = 12.0
    w_add = wnodes.new('ShaderNodeAddShader')

    wlinks.new(w_tex.outputs['Generated'], w_noise.inputs['Vector'])
    wlinks.new(w_noise.outputs['Factor'], w_ramp.inputs['Factor'])
    wlinks.new(w_ramp.outputs['Color'], w_stars_bg.inputs['Color'])
    wlinks.new(w_bg.outputs['Background'], w_add.inputs[0])
    wlinks.new(w_stars_bg.outputs['Background'], w_add.inputs[1])

    w_out = wnodes.new('ShaderNodeOutputWorld')
    wlinks.new(w_add.outputs['Shader'], w_out.inputs['Surface'])

    # 2. Distant Sun Light
    sun_data = bpy.data.lights.new(name="SunLight", type='SUN')
    sun_data.energy = 4.8
    sun_data.color = (1.0, 0.98, 0.95)
    sun_obj = bpy.data.objects.new(name="SunLight", object_data=sun_data)
    scene.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (math.radians(28), math.radians(-50), math.radians(40))

    # 3. Earth Rig (Axial Tilt: 23.44 degrees)
    rig = bpy.data.objects.new("Earth_Rig", None)
    scene.collection.objects.link(rig)
    rig.rotation_euler = (math.radians(-6.0), math.radians(23.44), 0)

    # 4. Earth Surface Sphere
    bpy.ops.mesh.primitive_uv_sphere_add(radius=2.0, segments=128, ring_count=128)
    earth = bpy.context.active_object
    earth.name = "Earth_Surface"
    earth.parent = rig
    for p in earth.data.polygons:
        p.use_smooth = True

    # Surface Material (Day, Night lights, Specular Ocean, Normal Bump)
    mat_earth = bpy.data.materials.new("EarthSurfaceMat")
    enodes = mat_earth.node_tree.nodes
    elinks = mat_earth.node_tree.links
    enodes.clear()

    uv = enodes.new('ShaderNodeTexCoord')

    # Day Map
    tex_day = enodes.new('ShaderNodeTexImage')
    tex_day.image = bpy.data.images.load(day_tex_path)

    # Night Map
    tex_night = enodes.new('ShaderNodeTexImage')
    tex_night.image = bpy.data.images.load(night_tex_path)

    # Normal Map
    tex_norm = enodes.new('ShaderNodeTexImage')
    tex_norm.image = bpy.data.images.load(normal_tex_path)
    tex_norm.image.colorspace_settings.name = 'Non-Color'
    norm_node = enodes.new('ShaderNodeNormalMap')
    norm_node.inputs['Strength'].default_value = 0.9
    elinks.new(uv.outputs['UV'], tex_norm.inputs['Vector'])
    elinks.new(tex_norm.outputs['Color'], norm_node.inputs['Color'])

    # Specular Map (Ocean gloss vs Land matte)
    tex_spec = enodes.new('ShaderNodeTexImage')
    tex_spec.image = bpy.data.images.load(spec_tex_path)
    tex_spec.image.colorspace_settings.name = 'Non-Color'
    elinks.new(uv.outputs['UV'], tex_spec.inputs['Vector'])

    spec_ramp = enodes.new('ShaderNodeValToRGB')
    spec_ramp.color_ramp.elements[0].position = 0.0
    spec_ramp.color_ramp.elements[0].color = (0.85, 0.85, 0.85, 1) # Land roughness
    spec_ramp.color_ramp.elements[1].position = 1.0
    spec_ramp.color_ramp.elements[1].color = (0.12, 0.12, 0.12, 1) # Ocean roughness
    elinks.new(tex_spec.outputs['Color'], spec_ramp.inputs['Factor'])

    # Day/Night terminator calculation via World Normal vs Sun Vector
    geom = enodes.new('ShaderNodeNewGeometry')
    sun_dot = enodes.new('ShaderNodeVectorMath')
    sun_dot.operation = 'DOT_PRODUCT'
    sun_dot.inputs[1].default_value = (0.62, -0.65, 0.44)
    elinks.new(geom.outputs['Normal'], sun_dot.inputs[0])

    dn_ramp = enodes.new('ShaderNodeValToRGB')
    dn_ramp.color_ramp.elements[0].position = 0.46
    dn_ramp.color_ramp.elements[0].color = (1, 1, 1, 1) # Night side
    dn_ramp.color_ramp.elements[1].position = 0.54
    dn_ramp.color_ramp.elements[1].color = (0, 0, 0, 1) # Day side
    elinks.new(sun_dot.outputs['Value'], dn_ramp.inputs['Factor'])

    # Principled BSDF
    bsdf = enodes.new('ShaderNodeBsdfPrincipled')
    elinks.new(uv.outputs['UV'], tex_day.inputs['Vector'])
    elinks.new(uv.outputs['UV'], tex_night.inputs['Vector'])
    elinks.new(tex_day.outputs['Color'], bsdf.inputs['Base Color'])
    elinks.new(spec_ramp.outputs['Color'], bsdf.inputs['Roughness'])
    elinks.new(norm_node.outputs['Normal'], bsdf.inputs['Normal'])

    # Night lights emission
    night_em = enodes.new('ShaderNodeMath')
    night_em.operation = 'MULTIPLY'
    night_em.inputs[1].default_value = 3.5
    elinks.new(dn_ramp.outputs['Color'], night_em.inputs[0])

    night_tint = enodes.new('ShaderNodeMix')
    night_tint.data_type = 'RGBA'
    night_tint.blend_type = 'MULTIPLY'
    elinks.new(dn_ramp.outputs['Color'], night_tint.inputs['Factor'])
    elinks.new(tex_night.outputs['Color'], night_tint.inputs['A'])
    night_tint.inputs['B'].default_value = (1.0, 0.88, 0.65, 1.0) # Warm city lights

    elinks.new(night_tint.outputs['Result'], bsdf.inputs['Emission Color'])
    elinks.new(night_em.outputs['Value'], bsdf.inputs['Emission Strength'])

    e_out = enodes.new('ShaderNodeOutputMaterial')
    elinks.new(bsdf.outputs['BSDF'], e_out.inputs['Surface'])
    earth.data.materials.append(mat_earth)

    # 5. Cloud Layer Sphere
    bpy.ops.mesh.primitive_uv_sphere_add(radius=2.012, segments=128, ring_count=128)
    clouds = bpy.context.active_object
    clouds.name = "Earth_Clouds"
    clouds.parent = rig
    for p in clouds.data.polygons:
        p.use_smooth = True

    mat_clouds = bpy.data.materials.new("EarthCloudsMat")
    mat_clouds.blend_method = 'BLEND'
    cnodes = mat_clouds.node_tree.nodes
    clinks = mat_clouds.node_tree.links
    cnodes.clear()

    c_uv = cnodes.new('ShaderNodeTexCoord')
    c_tex = cnodes.new('ShaderNodeTexImage')
    c_tex.image = bpy.data.images.load(clouds_tex_path)
    clinks.new(c_uv.outputs['UV'], c_tex.inputs['Vector'])

    c_bsdf = cnodes.new('ShaderNodeBsdfPrincipled')
    c_bsdf.inputs['Base Color'].default_value = (1.0, 1.0, 1.0, 1.0)
    c_bsdf.inputs['Roughness'].default_value = 0.6
    clinks.new(c_tex.outputs['Color'], c_bsdf.inputs['Alpha'])

    c_out = cnodes.new('ShaderNodeOutputMaterial')
    clinks.new(c_bsdf.outputs['BSDF'], c_out.inputs['Surface'])
    clouds.data.materials.append(mat_clouds)

    # 6. Atmospheric Rayleigh Scattering Glow
    bpy.ops.mesh.primitive_uv_sphere_add(radius=2.032, segments=128, ring_count=128)
    atmos = bpy.context.active_object
    atmos.name = "Earth_Atmosphere"
    atmos.parent = rig
    for p in atmos.data.polygons:
        p.use_smooth = True

    mat_atmos = bpy.data.materials.new("EarthAtmosphereMat")
    mat_atmos.blend_method = 'BLEND'
    anodes = mat_atmos.node_tree.nodes
    alinks = mat_atmos.node_tree.links
    anodes.clear()

    a_fresnel = anodes.new('ShaderNodeFresnel')
    a_fresnel.inputs['IOR'].default_value = 1.035

    a_geom = anodes.new('ShaderNodeNewGeometry')
    a_sun_dot = anodes.new('ShaderNodeVectorMath')
    a_sun_dot.operation = 'DOT_PRODUCT'
    a_sun_dot.inputs[1].default_value = (0.62, -0.65, 0.44)
    alinks.new(a_geom.outputs['Normal'], a_sun_dot.inputs[0])

    a_sun_ramp = anodes.new('ShaderNodeValToRGB')
    a_sun_ramp.color_ramp.elements[0].position = 0.42
    a_sun_ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    a_sun_ramp.color_ramp.elements[1].position = 0.58
    a_sun_ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    alinks.new(a_sun_dot.outputs['Value'], a_sun_ramp.inputs['Factor'])

    a_mix_alpha = anodes.new('ShaderNodeMath')
    a_mix_alpha.operation = 'MULTIPLY'
    alinks.new(a_fresnel.outputs['Factor'], a_mix_alpha.inputs[0])
    alinks.new(a_sun_ramp.outputs['Color'], a_mix_alpha.inputs[1])

    a_em = anodes.new('ShaderNodeEmission')
    a_em.inputs['Color'].default_value = (0.1, 0.45, 1.0, 1.0)
    a_em.inputs['Strength'].default_value = 2.8

    a_trans = anodes.new('ShaderNodeBsdfTransparent')
    a_mix_shader = anodes.new('ShaderNodeMixShader')

    alinks.new(a_mix_alpha.outputs['Value'], a_mix_shader.inputs['Factor'])
    alinks.new(a_trans.outputs['BSDF'], a_mix_shader.inputs[1])
    alinks.new(a_em.outputs['Emission'], a_mix_shader.inputs[2])

    a_out = anodes.new('ShaderNodeOutputMaterial')
    alinks.new(a_mix_shader.outputs['Shader'], a_out.inputs['Surface'])
    atmos.data.materials.append(mat_atmos)

    # 7. Animation (5 seconds, 120 frames)
    # Earth rotation
    earth.rotation_mode = 'XYZ'
    earth.rotation_euler = (0, 0, 0)
    earth.keyframe_insert(data_path="rotation_euler", index=2, frame=1)
    earth.rotation_euler = (0, 0, math.radians(50.0))
    earth.keyframe_insert(data_path="rotation_euler", index=2, frame=total_frames)

    # Clouds rotation (slightly faster for atmospheric drift)
    clouds.rotation_mode = 'XYZ'
    clouds.rotation_euler = (0, 0, 0)
    clouds.keyframe_insert(data_path="rotation_euler", index=2, frame=1)
    clouds.rotation_euler = (0, 0, math.radians(56.0))
    clouds.keyframe_insert(data_path="rotation_euler", index=2, frame=total_frames)

    # Set linear interpolation for smooth rotation (supporting Blender 5.x layered actions)
    for action in bpy.data.actions:
        if hasattr(action, 'fcurves'):
            for fc in action.fcurves:
                for kf in fc.keyframe_points:
                    kf.interpolation = 'LINEAR'
        if hasattr(action, 'layers'):
            for layer in action.layers:
                for strip in layer.strips:
                    for cb in strip.channelbags:
                        for fc in cb.fcurves:
                            for kf in fc.keyframe_points:
                                kf.interpolation = 'LINEAR'

    # 8. Camera
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 65
    cam_obj = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    cam_obj.location = (0, -11.2, 1.4)
    cam_obj.rotation_euler = (math.radians(82.5), 0, 0)

    # Save .blend file
    blend_path = os.path.join(output_dir, "rotating_earth.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"Saved project file to {blend_path}")

    # Render a Still Frame poster
    still_path = os.path.join(output_dir, "earth.png")
    scene.render.filepath = still_path
    scene.frame_set(30)
    print(f"Rendering high-res still poster to {still_path}...")
    bpy.ops.render.render(write_still=True)
    print("Still render complete!")

    # Animation Render Setup (PNG Frame Sequence -> ffmpeg MP4)
    frames_dir = os.path.join(output_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    frame_pattern = os.path.join(frames_dir, "frame_####.png")
    scene.render.filepath = frame_pattern
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'

    print(f"Rendering 5-second animation frames to {frames_dir} (120 frames)...")
    bpy.ops.render.render(animation=True)
    print("Animation frames render complete!")

    # Encode with ffmpeg to high-quality MP4 video
    video_path = os.path.join(output_dir, "rotating_earth.mp4")
    ffmpeg_cmd = (
        f'ffmpeg -y -framerate {fps} -i "{frames_dir}/frame_%04d.png" '
        f'-c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow "{video_path}"'
    )
    print(f"Encoding video with ffmpeg: {ffmpeg_cmd}")
    os.system(ffmpeg_cmd)
    print(f"Video created successfully at {video_path}!")

if __name__ == "__main__":
    setup_and_render_rotating_earth()
