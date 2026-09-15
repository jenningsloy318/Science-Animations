import bpy
import math

def build_masterpiece_gargantua(output_path="/tmp/gargantua_masterpiece.png", samples=128, res_x=1920, res_y=1080):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = samples
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.filepath = output_path
    
    # Color management: AgX High Contrast
    if hasattr(scene.view_settings, 'view_transform'):
        scene.view_settings.view_transform = 'AgX'
        scene.view_settings.look = 'AgX - High Contrast'

    # 1. Deep Space World & Starfield
    world = bpy.data.worlds.new("SpaceWorld")
    scene.world = world
    wnodes = world.node_tree.nodes
    wlinks = world.node_tree.links
    wnodes.clear()

    w_bg = wnodes.new('ShaderNodeBackground')
    w_bg.inputs['Color'].default_value = (0.0001, 0.00015, 0.0003, 1.0)
    w_bg.inputs['Strength'].default_value = 1.0

    # Starfield texture
    w_texcoord = wnodes.new('ShaderNodeTexCoord')
    w_noise = wnodes.new('ShaderNodeTexNoise')
    w_noise.inputs['Scale'].default_value = 750.0
    w_noise.inputs['Detail'].default_value = 15.0

    w_ramp = wnodes.new('ShaderNodeValToRGB')
    w_ramp.color_ramp.elements[0].position = 0.86
    w_ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
    w_ramp.color_ramp.elements[1].position = 0.89
    w_ramp.color_ramp.elements[1].color = (4.0, 4.5, 6.0, 1)

    w_bg_stars = wnodes.new('ShaderNodeBackground')
    w_add = wnodes.new('ShaderNodeAddShader')

    wlinks.new(w_texcoord.outputs['Generated'], w_noise.inputs['Vector'])
    wlinks.new(w_noise.outputs['Factor'], w_ramp.inputs['Factor'])
    wlinks.new(w_ramp.outputs['Color'], w_bg_stars.inputs['Color'])
    w_bg_stars.inputs['Strength'].default_value = 18.0

    wlinks.new(w_bg.outputs['Background'], w_add.inputs[0])
    wlinks.new(w_bg_stars.outputs['Background'], w_add.inputs[1])

    w_out = wnodes.new('ShaderNodeOutputWorld')
    wlinks.new(w_add.outputs['Shader'], w_out.inputs['Surface'])


    # 2. Central Event Horizon (Holdout Black Sphere - Radius 2.0)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=2.0, location=(0,0,0), segments=128, ring_count=128)
    eh = bpy.context.active_object
    eh.name = "EventHorizon"
    
    mat_eh = bpy.data.materials.new("EventHorizonMat")
    eh_nodes = mat_eh.node_tree.nodes
    eh_links = mat_eh.node_tree.links
    eh_nodes.clear()
    
    eh_ho = eh_nodes.new('ShaderNodeHoldout')
    eh_out = eh_nodes.new('ShaderNodeOutputMaterial')
    eh_links.new(eh_ho.outputs['Holdout'], eh_out.inputs['Surface'])
    eh.data.materials.append(mat_eh)


    # 3. Disk Mesh Generator Function
    def build_disk_mesh(name, inner_r, outer_r, rings=120, segments=360):
        mesh = bpy.data.meshes.new(name)
        obj = bpy.data.objects.new(name, mesh)
        scene.collection.objects.link(obj)
        
        import bmesh
        bm = bmesh.new()
        
        for r_idx in range(rings + 1):
            frac = r_idx / rings
            r = inner_r + (frac ** 1.3) * (outer_r - inner_r)
            for s_idx in range(segments):
                angle = (s_idx / segments) * 2.0 * math.pi
                x = r * math.cos(angle)
                y = r * math.sin(angle)
                bm.verts.new((x, y, 0.0))
                
        bm.verts.ensure_lookup_table()
        
        for r_idx in range(rings):
            for s_idx in range(segments):
                next_s = (s_idx + 1) % segments
                v1 = r_idx * segments + s_idx
                v2 = r_idx * segments + next_s
                v3 = (r_idx + 1) * segments + next_s
                v4 = (r_idx + 1) * segments + s_idx
                bm.faces.new((bm.verts[v1], bm.verts[v2], bm.verts[v3], bm.verts[v4]))
                
        bm.to_mesh(mesh)
        bm.free()
        return obj


    # 4. Photon Rim Ring (Razor-thin Einstein Rim around Horizon Edge)
    photon_ring = build_disk_mesh("PhotonRim", inner_r=2.01, outer_r=2.05, rings=10, segments=256)
    photon_ring.location = (0, 0, 0)
    mat_pr = bpy.data.materials.new("PhotonRimMat")
    pr_nodes = mat_pr.node_tree.nodes
    pr_links = mat_pr.node_tree.links
    pr_nodes.clear()

    pr_em = pr_nodes.new('ShaderNodeEmission')
    pr_em.inputs['Color'].default_value = (40.0, 60.0, 90.0, 1.0)
    pr_em.inputs['Strength'].default_value = 45.0

    pr_out = pr_nodes.new('ShaderNodeOutputMaterial')
    pr_links.new(pr_em.outputs['Emission'], pr_out.inputs['Surface'])
    photon_ring.data.materials.append(mat_pr)


    # 5. Main Accretion Disk (Flat Ring at Z=0, Inner R=2.45, Outer R=10.5)
    main_disk = build_disk_mesh("AccretionDisk_Main", inner_r=2.45, outer_r=10.5)

    mat_disk = bpy.data.materials.new("AccretionDiskMat")
    dnodes = mat_disk.node_tree.nodes
    dlinks = mat_disk.node_tree.links
    dnodes.clear()

    tex_coord = dnodes.new('ShaderNodeTexCoord')
    separate_xyz = dnodes.new('ShaderNodeSeparateXYZ')
    dlinks.new(tex_coord.outputs['Object'], separate_xyz.inputs['Vector'])

    # Radius = sqrt(X^2 + Y^2)
    vmath_dist = dnodes.new('ShaderNodeVectorMath')
    vmath_dist.operation = 'LENGTH'
    dlinks.new(tex_coord.outputs['Object'], vmath_dist.inputs[0])

    # Normalized radius u_r (0 at r=2.45, 1 at r=10.5)
    r_sub = dnodes.new('ShaderNodeMath')
    r_sub.operation = 'SUBTRACT'
    r_sub.inputs[1].default_value = 2.45
    dlinks.new(vmath_dist.outputs['Value'], r_sub.inputs[0])

    r_div = dnodes.new('ShaderNodeMath')
    r_div.operation = 'DIVIDE'
    r_div.inputs[1].default_value = 8.05
    dlinks.new(r_sub.outputs['Value'], r_div.inputs[0])

    # Plasma Color Heat Ramp
    color_ramp = dnodes.new('ShaderNodeValToRGB')
    color_ramp.color_ramp.interpolation = 'B_SPLINE'

    # 0.0: Inner edge fade
    color_ramp.color_ramp.elements[0].position = 0.0
    color_ramp.color_ramp.elements[0].color = (0, 0, 0, 1)

    # 0.03: Ultra hot cyan-white ISCO boundary
    el1 = color_ramp.color_ramp.elements.new(0.03)
    el1.color = (35.0, 50.0, 75.0, 1)

    # 0.15: Intense golden-yellow plasma
    el2 = color_ramp.color_ramp.elements.new(0.15)
    el2.color = (48.0, 24.0, 3.5, 1)

    # 0.42: Fiery amber orange
    el3 = color_ramp.color_ramp.elements.new(0.42)
    el3.color = (22.0, 5.0, 0.4, 1)

    # 0.78: Deep red outer dust
    el4 = color_ramp.color_ramp.elements.new(0.78)
    el4.color = (4.0, 0.4, 0.03, 1)

    # 1.0: Outer edge black
    color_ramp.color_ramp.elements[1].position = 1.0
    color_ramp.color_ramp.elements[1].color = (0, 0, 0, 1)

    dlinks.new(r_div.outputs['Value'], color_ramp.inputs['Factor'])

    # Multi-layered Swirling Noise Filaments
    noise1 = dnodes.new('ShaderNodeTexNoise')
    noise1.inputs['Scale'].default_value = 28.0
    noise1.inputs['Detail'].default_value = 15.0
    noise1.inputs['Roughness'].default_value = 0.75

    noise2 = dnodes.new('ShaderNodeTexNoise')
    noise2.inputs['Scale'].default_value = 80.0
    noise2.inputs['Detail'].default_value = 10.0
    noise2.inputs['Roughness'].default_value = 0.55

    dlinks.new(tex_coord.outputs['Object'], noise1.inputs['Vector'])
    dlinks.new(tex_coord.outputs['Object'], noise2.inputs['Vector'])

    noise_mix = dnodes.new('ShaderNodeMath')
    noise_mix.operation = 'MULTIPLY'
    dlinks.new(noise1.outputs['Factor'], noise_mix.inputs[0])
    dlinks.new(noise2.outputs['Factor'], noise_mix.inputs[1])

    # Doppler boost (left side X < 0 boosted in brightness)
    doppler = dnodes.new('ShaderNodeMath')
    doppler.operation = 'MULTIPLY_ADD'
    doppler.inputs[1].default_value = -0.16
    doppler.inputs[2].default_value = 1.0
    dlinks.new(separate_xyz.outputs['X'], doppler.inputs[0])

    emission = dnodes.new('ShaderNodeEmission')
    dlinks.new(color_ramp.outputs['Color'], emission.inputs['Color'])

    strength_math = dnodes.new('ShaderNodeMath')
    strength_math.operation = 'MULTIPLY'
    strength_math.inputs[1].default_value = 5.0
    dlinks.new(doppler.outputs['Value'], strength_math.inputs[0])

    strength_final = dnodes.new('ShaderNodeMath')
    strength_final.operation = 'MULTIPLY'
    dlinks.new(strength_math.outputs['Value'], strength_final.inputs[0])
    dlinks.new(noise_mix.outputs['Value'], strength_final.inputs[1])

    dlinks.new(strength_final.outputs['Value'], emission.inputs['Strength'])

    dout = dnodes.new('ShaderNodeOutputMaterial')
    dlinks.new(emission.outputs['Emission'], dout.inputs['Surface'])

    main_disk.data.materials.append(mat_disk)


    # 6. Physical Gravitational Lens Sphere (Radius 6.5, IOR = 1.20)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=6.5, location=(0,0,0), segments=256, ring_count=256)
    lens_sphere = bpy.context.active_object
    lens_sphere.name = "GravitationalLensSphere"

    mat_lens = bpy.data.materials.new("GravitationalLensMat")
    lnodes = mat_lens.node_tree.nodes
    llinks = mat_lens.node_tree.links
    lnodes.clear()

    refract = lnodes.new('ShaderNodeBsdfRefraction')
    refract.inputs['IOR'].default_value = 1.20
    refract.inputs['Roughness'].default_value = 0.0

    lout = lnodes.new('ShaderNodeOutputMaterial')
    llinks.new(refract.outputs['BSDF'], lout.inputs['Surface'])
    lens_sphere.data.materials.append(mat_lens)


    # 7. Camera Positioning & Framing
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 48
    cam_obj = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    cam_obj.location = (0, -32.0, 4.2)
    cam_obj.rotation_euler = (math.radians(82.5), 0, 0)


    # 8. Compositor Glow & Radiance
    ng = bpy.data.node_groups.new(name="Compositor", type='CompositorNodeTree')
    scene.compositing_node_group = ng
    cnodes = ng.nodes
    clinks = ng.links

    c_rl = cnodes.new('CompositorNodeRLayers')
    c_glare = cnodes.new('CompositorNodeGlare')
    if 'Type' in c_glare.inputs:
        c_glare.inputs['Type'].default_value = 'Fog Glow'

    c_out = cnodes.new('NodeGroupOutput')
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")

    clinks.new(c_rl.outputs['Image'], c_glare.inputs['Image'])
    clinks.new(c_glare.outputs['Image'], c_out.inputs['Image'])

    print(f"Rendering masterpiece Gargantua to {output_path}...")
    bpy.ops.render.render(write_still=True)
    print("Render finished successfully!")

if __name__ == "__main__":
    build_masterpiece_gargantua(output_path="/tmp/gargantua_masterpiece.png", samples=128, res_x=1920, res_y=1080)
